const axios = require('axios');
const { promptForToken } = require('../utils/promptUtils');
const { log } = require('../utils/logUtils');
const { DateTime } = require('luxon');
const { TokenManager } = require('./tokenManager');

async function refreshTikTokToken(refreshToken, config) {
  try {
    const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_key: config.platforms.tiktok.TIKTOK_CLIENT_KEY,
      client_secret: config.platforms.tiktok.TIKTOK_CLIENT_SECRET,
    });
    return {
      token: response.data.access_token,
      expiresAt: DateTime.now().plus({ seconds: response.data.expires_in }).toISO(),
      refreshToken: response.data.refresh_token,
    };
  } catch (error) {
    log('ERROR', `TikTok token refresh failed: ${error.response?.data?.error?.message || error.message}`);
    throw error;
  }
}

async function getTikTokToken(config) {
  const tokenManager = new TokenManager('tiktok', config);
  const existingToken = tokenManager.getToken();

  if (tokenManager.isTokenValid()) {
    log('INFO', `Using existing TikTok token: ${existingToken.token.substring(0, 10)}...`);
    return existingToken.token;
  }

  if (existingToken?.refreshToken) {
    const { token, expiresAt, refreshToken } = await refreshTikTokToken(existingToken.refreshToken, config);
    tokenManager.setToken(token, expiresAt, refreshToken);
    await tokenManager.save();
    return token;
  }

  const userAccessToken = await promptForToken('TikTok', 'video.publish scope');
  tokenManager.setToken(userAccessToken, DateTime.now().plus({ days: 30 }).toISO());
  await tokenManager.save();
  return userAccessToken;
}

module.exports = { getTikTokToken };