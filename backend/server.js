// backend/server.js
// Main Express server. Exposes REST API endpoints consumed by the React dashboard.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { getTrendingHeadlines, searchArticles, scrapeArticle } = require('./services/newsScraper');
const { generateLinkedInPost, generateFromTalkingPoints, regeneratePost, TONE_INSTRUCTIONS } = require('./services/claudeWriter');
const { generateBannerImage, IMAGE_DIR } = require('./services/imageComposer');
const { publishTextPost, publishImagePost, checkTokenValidity } = require('./services/linkedinPublisher');
const { addToQueue, removeFromQueue, getAllItems } = require('./services/queueManager');
const { startAutoScheduler, stopAutoScheduler, runAutoPost, getAutoSchedulerStatus, FREQUENCY_MAP } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve generated images as static files
app.use('/images', express.static(IMAGE_DIR));

// Multer for user-uploaded images (CREATE YOUR OWN tab)
const upload = multer({
  dest: IMAGE_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ─── Helper: wrap async route handlers ───────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ─────────────────────────────────────────────────────────────────────────────
// NEWS ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/news/trending — returns latest headlines from all sources
app.get('/api/news/trending', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const headlines = await getTrendingHeadlines(limit);
  res.json({ headlines });
}));

// GET /api/news/search?topic=OpenAI — search for articles on a topic
app.get('/api/news/search', asyncHandler(async (req, res) => {
  const topic = req.query.topic || '';
  if (!topic.trim()) return res.status(400).json({ error: 'topic query param is required' });

  const articles = await searchArticles(topic, 5);
  res.json({ articles });
}));

// POST /api/news/scrape — scrape full content from a URL
app.post('/api/news/scrape', asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  const result = await scrapeArticle(url);
  res.json(result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST GENERATION ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/generate — generate a LinkedIn post from an article
app.post('/api/generate', asyncHandler(async (req, res) => {
  const { title, content, source, tone } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content are required' });

  const result = await generateLinkedInPost({ title, content, source, tone });
  res.json(result);
}));

// POST /api/generate/custom — generate from user's own talking points
app.post('/api/generate/custom', asyncHandler(async (req, res) => {
  const { title, talkingPoints, tone, customHashtags } = req.body;
  if (!title || !talkingPoints) return res.status(400).json({ error: 'title and talkingPoints are required' });

  const result = await generateFromTalkingPoints({ title, talkingPoints, tone, customHashtags });
  res.json(result);
}));

// POST /api/generate/regenerate — regenerate with a different angle
app.post('/api/generate/regenerate', asyncHandler(async (req, res) => {
  const { title, content, source, tone, previousPost } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content are required' });

  const result = await regeneratePost({ title, content, source, tone, previousPost });
  res.json(result);
}));

// GET /api/tones — returns available tone options
app.get('/api/tones', (req, res) => {
  const tones = Object.entries(TONE_INSTRUCTIONS).map(([key, description]) => ({
    value: key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    description,
  }));
  res.json({ tones });
});

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/image/generate — generate a banner image for a topic
app.post('/api/image/generate', asyncHandler(async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  const result = await generateBannerImage(topic);
  // Return the URL path so the frontend can preview it
  res.json({ filepath: result.filepath, url: `/images/${result.filename}` });
}));

// POST /api/image/upload — accept a user-uploaded image
app.post('/api/image/upload', upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file received' });

  // Rename to a .png extension for LinkedIn API compatibility
  const newPath = req.file.path + '.png';
  fs.renameSync(req.file.path, newPath);

  const filename = path.basename(newPath);
  res.json({ filepath: newPath, url: `/images/${filename}` });
}));

// ─────────────────────────────────────────────────────────────────────────────
// PUBLISH ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/publish — publish a post to LinkedIn immediately
app.post('/api/publish', asyncHandler(async (req, res) => {
  const { postText, imageFilepath, title } = req.body;
  if (!postText) return res.status(400).json({ error: 'postText is required' });

  let result;
  if (imageFilepath && fs.existsSync(imageFilepath)) {
    result = await publishImagePost(postText, imageFilepath, title || '');
  } else {
    result = await publishTextPost(postText);
  }

  res.json(result);
}));

// GET /api/linkedin/status — check if the LinkedIn token is valid
app.get('/api/linkedin/status', asyncHandler(async (req, res) => {
  const status = await checkTokenValidity();
  res.json(status);
}));

// ─────────────────────────────────────────────────────────────────────────────
// QUEUE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/queue — add a post to the scheduled queue
app.post('/api/queue', asyncHandler(async (req, res) => {
  const { postText, scheduledAt, imageFilepath, title } = req.body;
  if (!postText || !scheduledAt) return res.status(400).json({ error: 'postText and scheduledAt are required' });

  const item = addToQueue({ postText, scheduledAt, imageFilepath, title });
  res.json(item);
}));

// GET /api/queue — get all queued posts
app.get('/api/queue', (req, res) => {
  const items = getAllItems();
  res.json({ items });
});

// DELETE /api/queue/:id — remove a post from the queue
app.delete('/api/queue/:id', (req, res) => {
  const removed = removeFromQueue(req.params.id);
  res.json({ success: removed });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-SCHEDULER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/scheduler/start — start the auto-scheduler
app.post('/api/scheduler/start', asyncHandler(async (req, res) => {
  const { frequency, tone, includeImage } = req.body;
  if (!frequency || !FREQUENCY_MAP[frequency]) {
    return res.status(400).json({ error: `Invalid frequency. Options: ${Object.keys(FREQUENCY_MAP).join(', ')}` });
  }

  const status = startAutoScheduler(frequency, { tone, includeImage });
  res.json(status);
}));

// POST /api/scheduler/stop — stop the auto-scheduler
app.post('/api/scheduler/stop', (req, res) => {
  const status = stopAutoScheduler();
  res.json(status);
});

// GET /api/scheduler/status — get current auto-scheduler status
app.get('/api/scheduler/status', (req, res) => {
  res.json(getAutoSchedulerStatus());
});

// POST /api/scheduler/run-now — trigger one auto-post immediately (for testing)
app.post('/api/scheduler/run-now', asyncHandler(async (req, res) => {
  const { topic, tone, includeImage } = req.body;
  const result = await runAutoPost({ topic, tone, includeImage });
  res.json({ success: true, ...result });
}));

// GET /api/scheduler/frequencies — get available frequency options
app.get('/api/scheduler/frequencies', (req, res) => {
  const frequencies = Object.keys(FREQUENCY_MAP).map((key) => ({
    value: key,
    label: formatFrequencyLabel(key),
  }));
  res.json({ frequencies });
});

// ─────────────────────────────────────────────────────────────────────────────
// ERROR HANDLER
// ─────────────────────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[server] Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ LinkedIn AI Bot backend running on http://localhost:${PORT}`);
  console.log(`   Dashboard: http://localhost:5173 (after starting the frontend)\n`);

  // Warn if credentials are missing
  const missing = [];
  if (!process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  if (!process.env.HF_API_KEY) missing.push('HF_API_KEY');
  if (!process.env.LINKEDIN_ACCESS_TOKEN) missing.push('LINKEDIN_ACCESS_TOKEN');
  if (!process.env.LINKEDIN_PERSON_ID) missing.push('LINKEDIN_PERSON_ID');

  if (missing.length) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn(`   Copy backend/.env.example to backend/.env and fill in your keys.\n`);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatFrequencyLabel(key) {
  const labels = {
    every_hour:    'Every hour (24 posts/day)',
    every_6h:      'Every 6 hours (4 posts/day)',
    every_12h:     'Every 12 hours (2 posts/day)',
    once_daily:    'Once a day at 9am (recommended)',
    twice_daily:   'Twice a day — 9am and 6pm',
    weekdays_only: 'Weekdays only at 9am',
  };
  return labels[key] || key;
}

module.exports = app;
