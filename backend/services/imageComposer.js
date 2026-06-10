// backend/services/imageComposer.js
// Generates professional banner images for LinkedIn posts using the Hugging Face Inference API.
// LinkedIn recommends 1200x627px for link/article images.

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const HF_API_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

// Directory to temporarily store generated images
const IMAGE_DIR = path.join(__dirname, '..', 'temp_images');
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

// ─── Generate a banner image from a topic/headline ───────────────────────────
async function generateBannerImage(topic) {
  if (!process.env.HF_API_KEY) {
    throw new Error('HF_API_KEY is not set in your .env file.');
  }

  // Build a clean, professional image prompt from the topic
  const imagePrompt = buildImagePrompt(topic);

  try {
    const response = await axios.post(
      HF_API_URL,
      {
        inputs: imagePrompt,
        parameters: {
          width: 1024,
          height: 512,
          num_inference_steps: 30,
          guidance_scale: 7.5,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 60000,
      }
    );

    // Save to a temporary file
    const filename = `banner_${uuidv4()}.png`;
    const filepath = path.join(IMAGE_DIR, filename);
    fs.writeFileSync(filepath, Buffer.from(response.data));

    // Schedule cleanup after 1 hour
    setTimeout(() => {
      try { fs.unlinkSync(filepath); } catch (_) {}
    }, 60 * 60 * 1000);

    return { filepath, filename };
  } catch (err) {
    if (err.response?.status === 503) {
      throw new Error('Image model is loading (cold start). Please wait 30 seconds and try again.');
    }
    throw new Error(`Image generation failed: ${err.message}`);
  }
}

// ─── Build a professional image prompt from a news topic ─────────────────────
function buildImagePrompt(topic) {
  const style =
    'professional corporate photography, clean minimalist design, high resolution, ' +
    '4K, sharp focus, LinkedIn banner style, neutral background, tech aesthetic, ' +
    'no text, no watermarks, no logos';

  // Map common topics to visual themes
  const topicLower = topic.toLowerCase();

  if (topicLower.includes('ai') || topicLower.includes('artificial intelligence') || topicLower.includes('machine learning')) {
    return `Abstract neural network visualization, glowing blue circuits and data nodes, dark background, ${style}`;
  }
  if (topicLower.includes('cloud') || topicLower.includes('aws') || topicLower.includes('azure')) {
    return `Modern data center with blue server racks, cloud computing concept, ${style}`;
  }
  if (topicLower.includes('cybersecurity') || topicLower.includes('security') || topicLower.includes('hack')) {
    return `Digital security concept, blue and green glowing shield, abstract cyber background, ${style}`;
  }
  if (topicLower.includes('startup') || topicLower.includes('funding') || topicLower.includes('venture')) {
    return `Modern office collaboration, diverse team meeting, whiteboard, startup energy, ${style}`;
  }
  if (topicLower.includes('robot') || topicLower.includes('automation')) {
    return `Futuristic robotic arm in modern factory, precision manufacturing, ${style}`;
  }
  if (topicLower.includes('mobile') || topicLower.includes('phone') || topicLower.includes('app')) {
    return `Modern smartphone with abstract app interface, clean tech product photography, ${style}`;
  }

  // Generic tech fallback
  return `Abstract technology concept with ${topic}, modern digital visualization, blue and white tones, ${style}`;
}

// ─── Read a locally uploaded image as base64 for LinkedIn API ────────────────
function readImageAsBase64(filepath) {
  const buffer = fs.readFileSync(filepath);
  return buffer.toString('base64');
}

// ─── Clean up old temp images (run at startup) ───────────────────────────────
function cleanupOldImages() {
  try {
    const files = fs.readdirSync(IMAGE_DIR);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    files.forEach((file) => {
      const filepath = path.join(IMAGE_DIR, file);
      const stat = fs.statSync(filepath);
      if (stat.mtimeMs < oneHourAgo) {
        fs.unlinkSync(filepath);
      }
    });
  } catch (_) {}
}

cleanupOldImages();

module.exports = { generateBannerImage, readImageAsBase64, IMAGE_DIR };
