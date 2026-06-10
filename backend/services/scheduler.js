// backend/services/scheduler.js
// Handles two jobs:
//   1. Auto-scheduler: finds news and posts on a user-set frequency
//   2. Queue processor: checks every minute for scheduled posts that are due

const cron = require('node-cron');
const { searchArticles, scrapeArticle, getRandomTopic } = require('./newsScraper');
const { generateLinkedInPost } = require('./claudeWriter');
const { generateBannerImage } = require('./imageComposer');
const { publishTextPost, publishImagePost } = require('./linkedinPublisher');
const { getDueItems, markPosted, markFailed } = require('./queueManager');

// ─── State ────────────────────────────────────────────────────────────────────
let autoSchedulerJob = null;
let autoSchedulerStatus = { running: false, frequency: null, lastRun: null, nextRun: null };

// ─── Cron expressions for each frequency option ───────────────────────────────
const FREQUENCY_MAP = {
  'every_hour':    '0 * * * *',
  'every_6h':      '0 */6 * * *',
  'every_12h':     '0 */12 * * *',
  'once_daily':    '0 9 * * *',
  'twice_daily':   '0 9,18 * * *',
  'weekdays_only': '0 9 * * 1-5',
};

// ─── Start the auto-scheduler ─────────────────────────────────────────────────
function startAutoScheduler(frequency = 'once_daily', options = {}) {
  const cronExpr = FREQUENCY_MAP[frequency];
  if (!cronExpr) throw new Error(`Unknown frequency: ${frequency}`);

  // Stop any existing job
  if (autoSchedulerJob) {
    autoSchedulerJob.stop();
    autoSchedulerJob = null;
  }

  autoSchedulerJob = cron.schedule(cronExpr, async () => {
    console.log('[scheduler] Auto-scheduler triggered');
    autoSchedulerStatus.lastRun = new Date().toISOString();
    try {
      await runAutoPost(options);
    } catch (err) {
      console.error('[scheduler] Auto-post failed:', err.message);
    }
  });

  autoSchedulerStatus = {
    running: true,
    frequency,
    cronExpr,
    lastRun: null,
    nextRun: getNextRunTime(cronExpr),
    options,
  };

  console.log(`[scheduler] Auto-scheduler started: ${frequency} (${cronExpr})`);
  return autoSchedulerStatus;
}

// ─── Stop the auto-scheduler ──────────────────────────────────────────────────
function stopAutoScheduler() {
  if (autoSchedulerJob) {
    autoSchedulerJob.stop();
    autoSchedulerJob = null;
  }
  autoSchedulerStatus = { running: false, frequency: null, lastRun: null, nextRun: null };
  console.log('[scheduler] Auto-scheduler stopped');
  return autoSchedulerStatus;
}

// ─── Run a single auto-post cycle ─────────────────────────────────────────────
async function runAutoPost(options = {}) {
  const topic = options.topic || getRandomTopic();
  const tone = options.tone || 'professional';
  const includeImage = options.includeImage !== false; // default true

  console.log(`[scheduler] Auto-posting about: "${topic}"`);

  // 1. Find a relevant article
  const articles = await searchArticles(topic, 3);
  if (!articles.length) throw new Error(`No articles found for topic: ${topic}`);

  const article = articles[0];

  // 2. Scrape full content
  const { content } = await scrapeArticle(article.url);
  const fullContent = content || article.summary || article.title;

  // 3. Generate post with Claude
  const { post } = await generateLinkedInPost({
    title: article.title,
    content: fullContent,
    source: article.source,
    tone,
  });

  // 4. Optionally generate a banner image
  let imageFilepath = null;
  if (includeImage) {
    try {
      const imgResult = await generateBannerImage(topic);
      imageFilepath = imgResult.filepath;
    } catch (imgErr) {
      console.warn('[scheduler] Image generation skipped:', imgErr.message);
    }
  }

  // 5. Publish to LinkedIn
  let result;
  if (imageFilepath) {
    result = await publishImagePost(post, imageFilepath, article.title);
  } else {
    result = await publishTextPost(post);
  }

  autoSchedulerStatus.lastRun = new Date().toISOString();
  console.log(`[scheduler] Auto-post published: ${result.postId}`);

  return { post, article, result };
}

// ─── Queue processor (runs every minute) ──────────────────────────────────────
cron.schedule('* * * * *', async () => {
  const dueItems = getDueItems();
  if (!dueItems.length) return;

  console.log(`[scheduler] Processing ${dueItems.length} due queue item(s)`);

  for (const item of dueItems) {
    try {
      let result;
      if (item.imageFilepath) {
        result = await publishImagePost(item.postText, item.imageFilepath, item.title);
      } else {
        result = await publishTextPost(item.postText);
      }
      markPosted(item.id, result.url);
      console.log(`[scheduler] Queued post published: ${item.id}`);
    } catch (err) {
      markFailed(item.id, err.message);
      console.error(`[scheduler] Queued post failed (${item.id}): ${err.message}`);
    }
  }
});

// ─── Estimate next run time from cron expression ──────────────────────────────
function getNextRunTime(cronExpr) {
  // Simple approximation — returns a rough ISO string
  try {
    const now = new Date();
    const parts = cronExpr.split(' ');
    const minute = parts[0] === '*' ? now.getMinutes() + 1 : parseInt(parts[0]);
    const hour = parts[1] === '*' ? now.getHours() : parseInt(parts[1]);
    const next = new Date(now);
    next.setMinutes(minute, 0, 0);
    if (parts[1] !== '*') next.setHours(hour);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  } catch (_) {
    return null;
  }
}

function getAutoSchedulerStatus() {
  return autoSchedulerStatus;
}

module.exports = {
  startAutoScheduler,
  stopAutoScheduler,
  runAutoPost,
  getAutoSchedulerStatus,
  FREQUENCY_MAP,
};
