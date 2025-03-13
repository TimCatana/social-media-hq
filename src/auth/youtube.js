const axios = require('axios');
const { promptForToken } = require('../utils/promptUtils');
const { log } = require('../utils/logUtils');
const { DateTime } = require('luxon');
const { TokenManager } = require('./tokenManager');

async function refreshYouTubeToken(refreshToken, config) {
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.platforms.youtube.YOUTUBE_CLIENT_ID,
      client_secret: config.platforms.youtube.YOUTUBE_CLIENT_SECRET,
    });
    return {
      token: response.data.access_token,
      expiresAt: DateTime.now().plus({ seconds: response.data.expires_in }).toISO(),
    };
  } catch (error) {
    log('ERROR', `YouTube token refresh failed: ${error.response?.data?.error?.message || error.message}`);
    throw error;
  }
}

async function getYouTubeToken(config) {
  const tokenManager = new TokenManager('youtube', config);
  const existingToken = tokenManager.getToken();

  if (tokenManager.isTokenValid()) {
    log('INFO', `Using existing YouTube token: ${existingToken.token.substring(0, 10)}...`);
    return existingToken.token;
  }

  if (existingToken?.refreshToken) {
    const { token, expiresAt } = await refreshYouTubeToken(existingToken.refreshToken, config);
    tokenManager.setToken(token, expiresAt, existingToken.refreshToken);
    await tokenManager.save();
    return token;
  }

  const userAccessToken = await promptForToken('YouTube', 'youtube.upload scope');
  tokenManager.setToken(userAccessToken, DateTime.now().plus({ hours: 1 }).toISO());
  await tokenManager.save();
  return userAccessToken;
}

module.exports = { getYouTubeToken };