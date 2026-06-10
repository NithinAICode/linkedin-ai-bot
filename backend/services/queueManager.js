// backend/services/queueManager.js
// Manages the scheduled post queue. Posts are stored in memory and persisted
// to a local JSON file so they survive server restarts.

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const QUEUE_FILE = path.join(__dirname, '..', 'queue.json');

// ─── Load queue from disk at startup ─────────────────────────────────────────
function loadQueue() {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    }
  } catch (_) {}
  return [];
}

// ─── Save queue to disk ───────────────────────────────────────────────────────
function saveQueue(queue) {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
  } catch (err) {
    console.error('[queueManager] Failed to save queue:', err.message);
  }
}

// In-memory queue (also synced to disk)
let queue = loadQueue();

// ─── Add a post to the queue ──────────────────────────────────────────────────
function addToQueue({ postText, scheduledAt, imageFilepath = null, title = '' }) {
  const item = {
    id: uuidv4(),
    postText,
    scheduledAt, // ISO string
    imageFilepath,
    title,
    status: 'pending', // pending | posted | failed
    createdAt: new Date().toISOString(),
  };
  queue.push(item);
  saveQueue(queue);
  return item;
}

// ─── Remove a post from the queue ────────────────────────────────────────────
function removeFromQueue(id) {
  const before = queue.length;
  queue = queue.filter((item) => item.id !== id);
  saveQueue(queue);
  return queue.length < before;
}

// ─── Get all pending queue items ─────────────────────────────────────────────
function getPendingItems() {
  return queue.filter((item) => item.status === 'pending');
}

// ─── Get all queue items (for display in dashboard) ───────────────────────────
function getAllItems() {
  return [...queue].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

// ─── Mark a queue item as posted ─────────────────────────────────────────────
function markPosted(id, postUrl = '') {
  const item = queue.find((i) => i.id === id);
  if (item) {
    item.status = 'posted';
    item.postedAt = new Date().toISOString();
    item.postUrl = postUrl;
    saveQueue(queue);
  }
}

// ─── Mark a queue item as failed ─────────────────────────────────────────────
function markFailed(id, reason = '') {
  const item = queue.find((i) => i.id === id);
  if (item) {
    item.status = 'failed';
    item.failReason = reason;
    saveQueue(queue);
  }
}

// ─── Get items that are due to be posted right now ───────────────────────────
function getDueItems() {
  const now = new Date();
  return queue.filter(
    (item) => item.status === 'pending' && new Date(item.scheduledAt) <= now
  );
}

module.exports = {
  addToQueue,
  removeFromQueue,
  getPendingItems,
  getAllItems,
  markPosted,
  markFailed,
  getDueItems,
};
