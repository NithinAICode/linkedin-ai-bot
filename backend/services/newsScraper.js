// backend/services/newsScraper.js
// Fetches trending tech news articles from RSS feeds and scrapes article content.

const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'LinkedIn-AI-Bot/1.0 (RSS Reader)' },
});

// ─── News sources ────────────────────────────────────────────────────────────
// Add or remove feeds here. Each entry has a name and RSS feed URL.
const NEWS_SOURCES = [
  { name: 'TechCrunch',       url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge',        url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica',     url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'Wired',            url: 'https://www.wired.com/feed/rss' },
  { name: 'MIT Tech Review',  url: 'https://www.technologyreview.com/feed/' },
  { name: 'VentureBeat',      url: 'https://venturebeat.com/feed/' },
  { name: 'Hacker News',      url: 'https://hnrss.org/frontpage?points=100' },
  { name: 'Reuters Tech',     url: 'https://feeds.reuters.com/reuters/technologyNews' },
  { name: 'BBC Technology',   url: 'http://feeds.bbci.co.uk/news/technology/rss.xml' },
];

// ─── Topics for auto-scheduler ────────────────────────────────────────────────
// The auto-scheduler randomly picks from this list each cycle.
// Add your own niche topics here.
const DEFAULT_TOPICS = [
  'OpenAI', 'Anthropic', 'Google AI', 'NVIDIA', 'Microsoft AI',
  'AI regulation', 'enterprise AI', 'generative AI', 'AI agents',
  'AI funding', 'machine learning', 'large language models',
  'tech layoffs', 'startup funding', 'cloud computing',
  'cybersecurity', 'AI ethics', 'robotics', 'semiconductor',
];

// ─── Fetch trending headlines from all sources ────────────────────────────────
async function getTrendingHeadlines(limit = 20) {
  const allItems = [];

  await Promise.allSettled(
    NEWS_SOURCES.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.url);
        const items = (feed.items || []).slice(0, 5).map((item) => ({
          title: item.title || '',
          url: item.link || item.guid || '',
          source: source.name,
          publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          summary: stripHtml(item.contentSnippet || item.content || '').slice(0, 200),
        }));
        allItems.push(...items);
      } catch (err) {
        console.warn(`[newsScraper] Failed to fetch ${source.name}: ${err.message}`);
      }
    })
  );

  // Sort by recency (most recent first), deduplicate by title similarity
  const sorted = allItems
    .filter((item) => item.title && item.url)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  return deduplicateByTitle(sorted).slice(0, limit);
}

// ─── Search articles by keyword/topic ─────────────────────────────────────────
async function searchArticles(topic, limit = 5) {
  const headlines = await getTrendingHeadlines(60);
  const lower = topic.toLowerCase();

  const matches = headlines.filter(
    (item) =>
      item.title.toLowerCase().includes(lower) ||
      item.summary.toLowerCase().includes(lower) ||
      item.source.toLowerCase().includes(lower)
  );

  // If keyword matches found, return those; otherwise return latest headlines
  return (matches.length > 0 ? matches : headlines).slice(0, limit);
}

// ─── Scrape full article content from a URL ───────────────────────────────────
async function scrapeArticle(url) {
  try {
    const response = await axios.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; LinkedInBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    const $ = cheerio.load(response.data);

    // Remove boilerplate elements
    $('script, style, nav, header, footer, aside, .ad, .advertisement, .cookie-banner, .newsletter-signup').remove();

    // Try common article content selectors in order of preference
    const contentSelectors = [
      'article',
      '[class*="article-body"]',
      '[class*="post-content"]',
      '[class*="entry-content"]',
      '[class*="story-body"]',
      'main',
      '.content',
    ];

    let articleText = '';
    for (const selector of contentSelectors) {
      const el = $(selector).first();
      if (el.length) {
        articleText = el.text();
        break;
      }
    }

    // Fallback to body text
    if (!articleText) {
      articleText = $('body').text();
    }

    // Get meta description as a fallback summary
    const metaDescription =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';

    const cleanContent = cleanText(articleText).slice(0, 4000);

    return {
      content: cleanContent || metaDescription,
      metaDescription,
    };
  } catch (err) {
    console.warn(`[newsScraper] Failed to scrape ${url}: ${err.message}`);
    return { content: '', metaDescription: '' };
  }
}

// ─── Get a random topic for the auto-scheduler ────────────────────────────────
function getRandomTopic() {
  return DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)];
}

// ─── Utility: strip HTML tags from a string ───────────────────────────────────
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Utility: clean scraped text ─────────────────────────────────────────────
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Utility: basic deduplication by title similarity ─────────────────────────
function deduplicateByTitle(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = {
  getTrendingHeadlines,
  searchArticles,
  scrapeArticle,
  getRandomTopic,
  DEFAULT_TOPICS,
};
