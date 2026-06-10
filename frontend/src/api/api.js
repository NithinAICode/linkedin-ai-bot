// frontend/src/api/api.js
// Centralised API calls to the backend. All components import from here.

import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const client = axios.create({ baseURL: BASE, timeout: 90000 });

// ─── News ─────────────────────────────────────────────────────────────────────
export const getTrending = () => client.get('/news/trending').then((r) => r.data);
export const searchNews = (topic) => client.get('/news/search', { params: { topic } }).then((r) => r.data);
export const scrapeUrl = (url) => client.post('/news/scrape', { url }).then((r) => r.data);

// ─── Generate ─────────────────────────────────────────────────────────────────
export const generatePost = (data) => client.post('/generate', data).then((r) => r.data);
export const generateCustomPost = (data) => client.post('/generate/custom', data).then((r) => r.data);
export const regeneratePost = (data) => client.post('/generate/regenerate', data).then((r) => r.data);
export const getTones = () => client.get('/tones').then((r) => r.data);

// ─── Image ────────────────────────────────────────────────────────────────────
export const generateImage = (topic) => client.post('/image/generate', { topic }).then((r) => r.data);
export const uploadImage = (file) => {
  const form = new FormData();
  form.append('image', file);
  return client.post('/image/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
};

// ─── Publish ──────────────────────────────────────────────────────────────────
export const publishPost = (postText, imageFilepath = null, title = '') =>
  client.post('/publish', { postText, imageFilepath, title }).then((r) => r.data);

export const checkLinkedInStatus = () => client.get('/linkedin/status').then((r) => r.data);

// ─── Queue ────────────────────────────────────────────────────────────────────
export const addToQueue = (data) => client.post('/queue', data).then((r) => r.data);
export const getQueue = () => client.get('/queue').then((r) => r.data);
export const deleteFromQueue = (id) => client.delete(`/queue/${id}`).then((r) => r.data);

// ─── Scheduler ───────────────────────────────────────────────────────────────
export const startScheduler = (data) => client.post('/scheduler/start', data).then((r) => r.data);
export const stopScheduler = () => client.post('/scheduler/stop').then((r) => r.data);
export const getSchedulerStatus = () => client.get('/scheduler/status').then((r) => r.data);
export const runSchedulerNow = (data) => client.post('/scheduler/run-now', data).then((r) => r.data);
export const getFrequencies = () => client.get('/scheduler/frequencies').then((r) => r.data);
