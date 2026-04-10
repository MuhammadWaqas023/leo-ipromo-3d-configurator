const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const TRIPO_BASE = 'https://api.tripo3d.ai/v2/openapi';

const DEBUG_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });

function getTripoClient(apiKey) {
  return axios.create({
    baseURL: TRIPO_BASE,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 60000,
  });
}


function buildPayload(modelVersion, imageToken, extension) {
  const payload = {
    type: 'image_to_model',
    model_version: modelVersion,
    file: {
      type: extension,
      file_token: imageToken,
    },
    texture: true,
    pbr: false,
    texture_quality: 'detailed',
    texture_alignment: 'original_image',
    orientation: 'align_image',
    enable_image_autofix: true,
  };

  if (modelVersion.startsWith('v3.')) {
    payload.geometry_quality = 'standard';
  }

  return payload;
}

/**
 * Download product image from URL, save a debug copy, upload to Tripo.
 * Returns { imageToken, extension, debugFile }
 */
async function uploadImageToTripo(imageUrl, apiKey) {
  console.log(`[Tripo] Downloading image: ${imageUrl}`);

  const imageResponse = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; iPromo-Configurator/1.0)' },
  });

  const imageBuffer = Buffer.from(imageResponse.data);
  const contentType = imageResponse.headers['content-type'] || 'image/png';
  const extension = /jpe?g/i.test(contentType) ? 'jpg' : 'png';

  const debugFile = path.join(DEBUG_DIR, `product_${Date.now()}.${extension}`);
  fs.writeFileSync(debugFile, imageBuffer);
  console.log(`[Tripo] Debug image saved: ${debugFile} (${imageBuffer.length} bytes)`);

  console.log(`[Tripo] Uploading to Tripo...`);
  const form = new FormData();
  form.append('file', imageBuffer, { filename: `product.${extension}`, contentType });

  let uploadRes;
  try {
    uploadRes = await axios.post(`${TRIPO_BASE}/upload`, form, {
      headers: { 'Authorization': `Bearer ${apiKey}`, ...form.getHeaders() },
      timeout: 30000,
    });
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`Tripo upload failed: ${detail}`);
  }

  const imageToken = uploadRes.data?.data?.image_token;
  if (!imageToken) {
    throw new Error(`No image_token in upload response: ${JSON.stringify(uploadRes.data)}`);
  }

  console.log(`[Tripo] Upload OK. Token: ${imageToken}`);
  return { imageToken, extension, debugFile };
}

/**
 * Submit image_to_model task.
 * Tries v3.1 first (best quality), falls back through v2.5 → v2.0 on credit errors.
 * Returns taskId string.
 */
async function submitTask(imageToken, extension, apiKey) {
  const client = getTripoClient(apiKey);

  const modelsToTry = ['v3.1-20260211', 'v2.5-20250123', 'v2.0-20240919'];

  for (const modelVersion of modelsToTry) {
    console.log(`[Tripo] Trying model: ${modelVersion} (pbr: false, texture: true)...`);

    const payload = buildPayload(modelVersion, imageToken, extension);

    let response;
    try {
      response = await client.post('/task', payload);
    } catch (err) {
      const errData = err.response?.data;
      const errCode = errData?.code;

      if (errCode === 2010) {
        console.warn(`[Tripo] Not enough credits for ${modelVersion}, trying next model...`);
        continue;
      }

      const detail = errData ? JSON.stringify(errData) : err.message;
      throw new Error(`Tripo task submission failed: ${detail}`);
    }

    const taskId = response.data?.data?.task_id;
    if (!taskId) throw new Error(`No task_id in response: ${JSON.stringify(response.data)}`);

    console.log(`[Tripo] Task submitted. Model: ${modelVersion} | ID: ${taskId}`);
    return taskId;
  }

  throw new Error(
    'Insufficient Tripo credits for all available model versions. ' +
    'Please top up your account at https://platform.tripo3d.ai'
  );
}

/**
 * Poll task status every 4 seconds until success or failure (10 min timeout).
 * Calls onProgress(0–100) as progress updates come in.
 * Returns { glbUrl, thumbnail }
 */
async function pollUntilComplete(taskId, apiKey, onProgress = () => { }) {
  const client = getTripoClient(apiKey);
  const MAX_MS = 10 * 60 * 1000;
  const POLL_MS = 4000;
  const start = Date.now();

  console.log(`[Tripo] Polling task ${taskId}...`);

  while (true) {
    if (Date.now() - start > MAX_MS) {
      throw new Error('Tripo generation timed out after 10 minutes');
    }

    await sleep(POLL_MS);

    let taskData;
    try {
      const res = await client.get(`/task/${taskId}`);
      taskData = res.data?.data;
    } catch (err) {
      console.warn(`[Tripo] Poll request failed (retrying): ${err.message}`);
      continue;
    }

    const { status, progress, output } = taskData;
    console.log(`[Tripo] Status: ${status} | Progress: ${progress || 0}%`);
    onProgress(progress || 0);

    if (status === 'success') {
      const glbUrl = output?.model || output?.rendered_image;
      if (!glbUrl) {
        throw new Error(`No model URL in Tripo output: ${JSON.stringify(output)}`);
      }
      console.log(`[Tripo] ✓ Model ready: ${glbUrl}`);
      return { glbUrl, thumbnail: output?.rendered_image || null };
    }

    if (status === 'failed' || status === 'cancelled') {
      console.error(`[Tripo] Task ${status}. Full response:`, JSON.stringify(taskData));
      throw new Error(
        `Tripo generation ${status}: ${taskData.message || taskData.reason || 'Unknown error'}`
      );
    }
  }
}

/**
 * Main entry point — called by server.js
 */
async function generateModel(imageUrl, apiKey, onProgress) {
  const { imageToken, extension, debugFile } = await uploadImageToTripo(imageUrl, apiKey);
  const taskId = await submitTask(imageToken, extension, apiKey);
  const result = await pollUntilComplete(taskId, apiKey, onProgress);
  return { taskId, debugFile, ...result };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { generateModel, uploadImageToTripo, submitTask, pollUntilComplete };