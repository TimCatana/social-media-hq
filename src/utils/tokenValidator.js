const { log } = require('./logUtils');
const axios = require('axios');

async function validateToken(url, params, platform, options = {}) {
  try {
    const response = await axios.get(url, { params, ...options });
    log('INFO', `Validated ${platform} token: ${response.data.name || response.data.username || response.data.id || 'valid'}`);
    return true;
  } catch (error) {
    log('ERROR', `${platform} token validation failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

async function validateFacebookToken(token, config) {
  return await validateToken(`https://graph.facebook.com/v20.0/${config.platforms.facebook.PAGE_ID}`, { access_token: token, fields: 'id,name' }, 'Facebook');
}

async function validateInstagramToken(token, config) {
  return await validateToken(`https://graph.facebook.com/v20.0/${config.platforms.instagram.INSTAGRAM_BUSINESS_ACCOUNT_ID}`, { access_token: token, fields: 'id,username' }, 'Instagram');
}

async function validatePinterestToken(token) {
  return await validateToken('https://api.pinterest.com/v5/user_account', { access_token: token }, 'Pinterest');
}

async function validateRumbleToken(token) {
  return true; // Hypothetical API, no validation possible
}

async function validateThreadsToken(token, config) {
  return await validateToken(`https://graph.threads.net/v1.0/${config.platforms.threads.INSTAGRAM_BUSINESS_ACCOUNT_ID}`, { access_token: token, fields: 'id,username' }, 'Threads');
}

async function validateTikTokToken(token) {
  return await validateToken('https://open.tiktokapis.com/v2/user/info/', { access_token: token, fields: 'open_id' }, 'TikTok');
}

async function validateTwitterToken(token) {
  return await validateToken('https://api.twitter.com/2/users/me', {}, 'Twitter', { headers: { Authorization: `Bearer ${token}` } });
}

async function validateYouTubeToken(token) {
  return await validateToken('https://www.googleapis.com/youtube/v3/channels', { access_token: token, part: 'id', mine: true }, 'YouTube');
}

module.exports = {
  validateFacebookToken,
  validateInstagramToken,
  validatePinterestToken,
  validateRumbleToken,
  validateThreadsToken,
  validateTikTokToken,
  validateTwitterToken,
  validateYouTubeToken,
};