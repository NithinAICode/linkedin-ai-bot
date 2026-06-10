// backend/services/claudeWriter.js
// Uses the Anthropic Claude API to write professional LinkedIn posts from news articles.
// This file is the creative heart of the bot — customize the prompts here.

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Model to use ─────────────────────────────────────────────────────────────
const MODEL = 'claude-sonnet-4-20250514';

// ─── Your professional persona ────────────────────────────────────────────────
// Change this to match your voice and expertise.
const PERSONA = `You are a seasoned technology leader and LinkedIn content creator.
You write for an audience of professionals, executives, founders, and tech enthusiasts.
Your tone is confident but not arrogant, insightful but accessible.
You share genuine opinions. You never sound like a marketing brochure.`;

// ─── Default hashtags appended to every post ─────────────────────────────────
// Keep to 3-5 relevant hashtags. LinkedIn suppresses posts with too many.
const DEFAULT_HASHTAGS = ['#AI', '#TechLeadership', '#DigitalTransformation', '#Innovation'];

// ─── Optional personal signature ─────────────────────────────────────────────
// Set to empty string '' to disable.
const SIGNATURE = '';

// ─── Tone definitions ─────────────────────────────────────────────────────────
const TONE_INSTRUCTIONS = {
  professional: 'Write with the authority of a senior professional. Balanced, credible, and thoughtful.',
  technical: 'Include technical depth. Your audience includes engineers, architects, and CTOs who appreciate specifics.',
  executive: 'Write from a strategic leadership perspective. Focus on business impact, team implications, and competitive dynamics.',
  conversational: 'Be direct and candid. Write as if you are talking to a colleague over coffee — not presenting to a board.',
  founder: 'Write as a founder who has lived through the highs and lows of building. Be candid, specific, and human.',
};

// ─── Main post generation function ───────────────────────────────────────────
async function generateLinkedInPost({ title, content, source, tone = 'professional', customHashtags = [] }) {
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;
  const hashtags = [...DEFAULT_HASHTAGS, ...customHashtags].slice(0, 5);

  const prompt = `${PERSONA}

${toneInstruction}

Here is a news article to write a LinkedIn post about:

TITLE: ${title}
SOURCE: ${source || 'Tech News'}
CONTENT: ${content}

Write a LinkedIn post that follows this exact structure:

1. HOOK (first line): One bold, specific sentence that stops the scroll. State the core tension, surprise, or implication — not just what happened.

2. CONTEXT (2-3 sentences): What happened? Who is involved? Why does this matter right now?

3. INSIGHT (2-4 sentences): Your professional take. What does this mean for the industry, for professionals reading this, or for the direction technology is heading? This is the most important section — be specific and opinionated.

4. KEY TAKEAWAYS: Exactly 3 numbered points. Each should be a concrete, memorable observation or implication that a reader will think about after they close the tab.

5. CLOSING QUESTION: End with one genuine open question that invites meaningful responses. Make it specific enough that people want to answer it, not generic like "What do you think?"

FORMAT RULES:
- Use blank lines between each section for readability
- Do NOT use markdown (no ##, no **, no _)
- Keep total length between 900 and 1400 characters
- End the post (after the question) with these hashtags on their own line: ${hashtags.join(' ')}
${SIGNATURE ? `- Add this signature on its own line after the hashtags: ${SIGNATURE}` : ''}

Write only the post. No preamble, no "here is your post:", no explanation.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const postText = message.content[0]?.text?.trim() || '';

  return {
    post: postText,
    characterCount: postText.length,
    model: MODEL,
    tone,
  };
}

// ─── Generate a post from just talking points (CREATE YOUR OWN tab) ──────────
async function generateFromTalkingPoints({ title, talkingPoints, tone = 'professional', customHashtags = [] }) {
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;
  const hashtags = [...DEFAULT_HASHTAGS, ...customHashtags].slice(0, 5);

  const prompt = `${PERSONA}

${toneInstruction}

A professional has given you the following topic and talking points to turn into a LinkedIn post:

TOPIC / TITLE: ${title}
TALKING POINTS:
${talkingPoints}

Turn these into a well-structured LinkedIn post following this format:

1. HOOK (first line): One bold, specific sentence that stops the scroll.

2. CONTEXT / BACKGROUND: 2-3 sentences setting up the topic and why it matters.

3. YOUR PERSPECTIVE: 3-4 sentences expanding on the talking points with genuine professional insight.

4. KEY TAKEAWAYS: Exactly 3 numbered points drawn from the talking points.

5. CLOSING QUESTION: One specific question that invites meaningful responses.

FORMAT RULES:
- Use blank lines between each section
- Do NOT use markdown (no ##, no **, no _)
- Keep total length between 900 and 1400 characters
- End with hashtags: ${hashtags.join(' ')}
${SIGNATURE ? `- Signature: ${SIGNATURE}` : ''}

Write only the post. No preamble.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const postText = message.content[0]?.text?.trim() || '';

  return {
    post: postText,
    characterCount: postText.length,
    model: MODEL,
    tone,
  };
}

// ─── Regenerate with slight variation ────────────────────────────────────────
async function regeneratePost({ title, content, source, tone = 'professional', previousPost = '' }) {
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;
  const hashtags = DEFAULT_HASHTAGS.slice(0, 4);

  const differentiation = previousPost
    ? `A previous version was already written. Write a DIFFERENT angle — different hook, different insight, different takeaways. Do not repeat phrases from: "${previousPost.slice(0, 200)}..."`
    : '';

  const prompt = `${PERSONA}

${toneInstruction}
${differentiation}

Article:
TITLE: ${title}
SOURCE: ${source || 'Tech News'}
CONTENT: ${content}

Write a LinkedIn post (900-1400 chars) with: hook → context → insight → 3 numbered takeaways → question → ${hashtags.join(' ')}

Write only the post.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const postText = message.content[0]?.text?.trim() || '';
  return { post: postText, characterCount: postText.length, model: MODEL };
}

module.exports = {
  generateLinkedInPost,
  generateFromTalkingPoints,
  regeneratePost,
  TONE_INSTRUCTIONS,
};
