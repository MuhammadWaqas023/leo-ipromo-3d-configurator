/**
 * api.js
 * Centralised API calls to the backend.
 */

import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const client = axios.create({ baseURL: BASE, timeout: 30000 });

/** Scrape product data from an iPromo URL */
export async function scrapeProduct(url) {
  const { data } = await client.post('/api/scrape', { url });
  return data; // { productName, primaryImage, colors, sku, sourceUrl }
}

/** Kick off Meshy 3D generation. Returns { jobId } */
export async function startGeneration(imageUrl, productUrl) {
  const { data } = await client.post('/api/generate', { imageUrl, productUrl });
  return data;
}

/** Poll job status */
export async function getJobStatus(jobId) {
  const { data } = await client.get(`/api/status/${jobId}`);
  return data;
}

/** Poll every 4s until SUCCEEDED or FAILED */
export function pollJobUntilDone(jobId, onProgress) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const status = await getJobStatus(jobId);
        if (onProgress) onProgress(status.progress || 0);

        if (status.status === 'SUCCEEDED') {
          clearInterval(interval);
          resolve(status);
        } else if (status.status === 'FAILED') {
          clearInterval(interval);
          reject(new Error(status.error || 'Model generation failed'));
        }
      } catch (err) {
        console.warn('[Poll] Request failed, retrying:', err.message);
      }
    }, 4000);
  });
}