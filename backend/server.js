require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { scrapeProduct } = require('./scraper');
const { generateModel } = require('./tripo');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;
const TRIPO_API_KEY = process.env.TRIPO_API_KEY || '';

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

const scrapeCache = new Map();

const modelCache = new Map();

const jobs = new Map();

/**
 * Creates a consistent hash from a URL string (used as cache key)
 */
function hashUrl(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}


app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    tripoConfigured: !!TRIPO_API_KEY,
    cachedModels: modelCache.size,
    cachedScrapes: scrapeCache.size,
  });
});

app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes('ipromo.com')) {
    return res.status(400).json({ error: 'Please provide a valid iPromo product URL' });
  }

  if (scrapeCache.has(url)) {
    console.log(`[/api/scrape] Cache hit for: ${url}`);
    return res.json({ ...scrapeCache.get(url), cached: true });
  }

  try {
    const productData = await scrapeProduct(url);
    scrapeCache.set(url, productData);
    res.json(productData);
  } catch (err) {
    console.error(`[/api/scrape] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/generate', async (req, res) => {
  const { imageUrl, productUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  if (!TRIPO_API_KEY) {
    return res.status(503).json({
      error: 'Tripo API key not configured. Set TRIPO_API_KEY in environment variables.',
    });
  }

  const cacheKey = hashUrl(imageUrl);

  if (modelCache.has(cacheKey)) {
    const cached = modelCache.get(cacheKey);
    console.log(`[/api/generate] Model cache hit: ${cacheKey}`);
    return res.json({
      jobId: cacheKey,
      status: 'SUCCEEDED',
      cached: true,
      ...cached,
      glbUrl: cached.glbUrl
        ? `/api/proxy-glb?url=${encodeURIComponent(cached.glbUrl)}&jobId=${cacheKey}`
        : undefined,
    });
  }

  if (jobs.has(cacheKey)) {
    const existing = jobs.get(cacheKey);
    if (existing.status !== 'FAILED') {
      console.log(`[/api/generate] Job already running: ${cacheKey}`);
      return res.json({ jobId: cacheKey, status: existing.status });
    }
  }

  const jobId = cacheKey;
  jobs.set(jobId, { status: 'PENDING', progress: 0, result: null, error: null });

  runGenerationJob(jobId, imageUrl).catch(err => {
    console.error(`[Job ${jobId}] Unhandled error:`, err.message);
  });

  res.json({ jobId, status: 'PENDING' });
});

/**
 * Background job: calls Tripo, updates job status, caches on success
 */
async function runGenerationJob(jobId, imageUrl) {
  console.log(`[Job ${jobId}] Starting generation...`);

  try {
    jobs.set(jobId, { status: 'IN_PROGRESS', progress: 0, result: null, error: null });

    const result = await generateModel(imageUrl, TRIPO_API_KEY, (progress) => {
      const current = jobs.get(jobId) || {};
      jobs.set(jobId, { ...current, progress });
    });

    const cacheKey = hashUrl(imageUrl);
    modelCache.set(cacheKey, result);

    jobs.set(jobId, {
      status: 'SUCCEEDED',
      progress: 100,
      result,
      error: null,
    });

    console.log(`[Job ${jobId}] Complete! GLB: ${result.glbUrl}`);

  } catch (err) {
    console.error(`[Job ${jobId}] Failed:`, err.message);
    jobs.set(jobId, {
      status: 'FAILED',
      progress: 0,
      result: null,
      error: err.message,
    });
  }
}

app.get('/api/proxy-glb', async (req, res) => {
  let { url, jobId } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'url query param is required' });
  }

  if (req.originalUrl.includes('&') && !url.includes('Signature=')) {
    const urlMatch = req.originalUrl.match(/url=([^&]+)/);
    if (urlMatch) {
    }
  }

  try {
    console.log(`[/api/proxy-glb] Fetching: ${url.substring(0, 100)}...`);

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.ipromo.com/',
        'Origin': 'https://www.ipromo.com/',
      },
    });

    console.log(`[/api/proxy-glb] Success: ${response.data.byteLength} bytes`);

    res.set({
      'Content-Type': 'model/gltf-binary',
      'Content-Length': response.data.byteLength,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    });

    res.send(Buffer.from(response.data));
  } catch (err) {
    const status = err.response?.status || 500;
    const errDetail = err.response?.data
      ? (Buffer.isBuffer(err.response.data) ? err.response.data.toString() : JSON.stringify(err.response.data))
      : err.message;

    console.error(`[/api/proxy-glb] Error ${status} fetching GLB:`, errDetail);

    if (status === 403 && jobId && modelCache.has(jobId)) {
      console.warn(`[/api/proxy-glb] Invalidating expired cache for ${jobId}`);
      modelCache.delete(jobId);
    }

    res.status(status).json({
      error: 'Failed to fetch GLB',
      message: err.message,
      detail: errDetail,
      status
    });
  }
});


app.get('/api/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    if (modelCache.has(jobId)) {
      const cached = modelCache.get(jobId);
      return res.json({
        status: 'SUCCEEDED',
        progress: 100,
        ...cached,
        glbUrl: cached.glbUrl
          ? `/api/proxy-glb?url=${encodeURIComponent(cached.glbUrl)}&jobId=${jobId}`
          : undefined,
      });
    }
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    jobId,
    status: job.status,
    progress: job.progress,
    ...(job.result ? {
      ...job.result,
      glbUrl: job.result.glbUrl
        ? `/api/proxy-glb?url=${encodeURIComponent(job.result.glbUrl)}&jobId=${jobId}`
        : undefined,
    } : {}),
    error: job.error,
  });
});


app.listen(PORT, () => {
  console.log(`\n iPromo Configurator Backend running on port ${PORT}`);
  console.log(`   Tripo API: ${TRIPO_API_KEY ? 'Configured' : 'NOT configured (set TRIPO_API_KEY)'}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;