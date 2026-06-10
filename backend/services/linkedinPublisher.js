// backend/services/linkedinPublisher.js
// Publishes posts to LinkedIn using the LinkedIn API v2 ugcPosts endpoint.
// Handles text-only posts and posts with images.

const axios = require('axios');
const fs = require('fs');

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

// ─── Validate that LinkedIn credentials are configured ────────────────────────
function validateCredentials() {
  if (!process.env.LINKEDIN_ACCESS_TOKEN) {
    throw new Error('LINKEDIN_ACCESS_TOKEN is not set in your .env file.');
  }
  if (!process.env.LINKEDIN_PERSON_ID) {
    throw new Error('LINKEDIN_PERSON_ID is not set in your .env file.');
  }
}

// ─── Publish a text-only post ─────────────────────────────────────────────────
async function publishTextPost(postText) {
  validateCredentials();

  const personUrn = `urn:li:person:${process.env.LINKEDIN_PERSON_ID}`;

  const body = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: postText,
        },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const response = await axios.post(`${LINKEDIN_API_BASE}/ugcPosts`, body, {
    headers: {
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });

  return {
    success: true,
    postId: response.headers['x-restli-id'] || response.data?.id || 'unknown',
    url: buildPostUrl(response.headers['x-restli-id'] || ''),
  };
}

// ─── Upload an image to LinkedIn and get an asset URN ─────────────────────────
async function uploadImage(imageFilepath) {
  validateCredentials();

  const personUrn = `urn:li:person:${process.env.LINKEDIN_PERSON_ID}`;

  // Step 1: Register the image upload
  const registerResponse = await axios.post(
    `${LINKEDIN_API_BASE}/assets?action=registerUpload`,
    {
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: personUrn,
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const uploadUrl =
    registerResponse.data.value.uploadMechanism[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ].uploadUrl;

  const assetUrn = registerResponse.data.value.asset;

  // Step 2: Upload the binary image data
  const imageData = fs.readFileSync(imageFilepath);
  await axios.put(uploadUrl, imageData, {
    headers: {
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'image/png',
    },
  });

  return assetUrn;
}

// ─── Publish a post with an image ─────────────────────────────────────────────
async function publishImagePost(postText, imageFilepath, imageTitle = '') {
  validateCredentials();

  const personUrn = `urn:li:person:${process.env.LINKEDIN_PERSON_ID}`;

  // Upload image first
  const assetUrn = await uploadImage(imageFilepath);

  const body = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: postText,
        },
        shareMediaCategory: 'IMAGE',
        media: [
          {
            status: 'READY',
            description: { text: imageTitle || 'Article banner' },
            media: assetUrn,
            title: { text: imageTitle || 'Tech News' },
          },
        ],
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const response = await axios.post(`${LINKEDIN_API_BASE}/ugcPosts`, body, {
    headers: {
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });

  return {
    success: true,
    postId: response.headers['x-restli-id'] || response.data?.id || 'unknown',
    url: buildPostUrl(response.headers['x-restli-id'] || ''),
  };
}

// ─── Check if the access token is still valid ─────────────────────────────────
async function checkTokenValidity() {
  try {
    const response = await axios.get(`${LINKEDIN_API_BASE}/userinfo`, {
      headers: {
        Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      },
    });
    return {
      valid: true,
      name: response.data?.name || 'Unknown',
      sub: response.data?.sub || '',
    };
  } catch (err) {
    if (err.response?.status === 401) {
      return { valid: false, reason: 'Token expired or invalid. Please regenerate in developer.linkedin.com.' };
    }
    return { valid: false, reason: err.message };
  }
}

// ─── Build a LinkedIn post URL from the post ID ───────────────────────────────
function buildPostUrl(postId) {
  // LinkedIn post IDs look like: urn:li:ugcPost:7123456789012345678
  // The public URL uses the numeric part
  const numeric = postId.replace(/[^0-9]/g, '');
  return numeric ? `https://www.linkedin.com/feed/update/urn:li:ugcPost:${numeric}` : '';
}

module.exports = {
  publishTextPost,
  publishImagePost,
  checkTokenValidity,
};
