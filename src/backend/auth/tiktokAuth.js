const prompts = require('prompts');
const axios = require('axios');
const { DateTime } = require('luxon');
const { TokenManager, saveConfig } = require('./authUtils');
const { log } = require('../logging/logUtils'); // Updated to logUtils

async function promptForUserToken() {
  const { userAccessToken } = await prompts({
    type: 'text',
    name: 'userAccessToken',
    message: 'Enter a User Access Token for TikTok (from TikTok Developer Portal with video.publish scope):',
    validate: v => v === '' || !!v || 'A valid User Access Token is required',
  }, { onCancel: () => { throw new Error('User cancelled token prompt'); } });

  if (userAccessToken === '') {
    log('INFO', 'TikTokAuth: User pressed Enter to go back');
    throw new Error('User chose to go back');
  }

  log('INFO', `TikTokAuth: Prompted user token: ${userAccessToken.substring(0, 10)}...`);
  return userAccessToken;
}

async function refreshTikTokToken(refreshToken, config) {
  try {
    const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET
    });
    const newAccessToken = response.data.access_token;
    const expiresIn = response.data.expires_in;
    const newRefreshToken = response.data.refresh_token;
    log('INFO', `TikTokAuth: Refreshed token: ${newAccessToken.substring(0, 10)}... (expires in ${expiresIn} seconds)`);
    return { token: newAccessToken, expiresAt: DateTime.now().plus({ seconds: expiresIn }).toISO(), refreshToken: newRefreshToken };
  } catch (error) {
    log('ERROR', `TikTokAuth: Failed to refresh token: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

async function getTikTokToken(config) {
  const tokenManager = new TokenManager('tiktok', config);
  const existingToken = tokenManager.getToken();

  if (existingToken && DateTime.fromISO(existingToken.expiresAt) > DateTime.now().plus({ days: 5 })) {
    log('INFO', `TikTokAuth: Using existing token: ${existingToken.token.substring(0, 10)}...`);
    return existingToken.token;
  }

  if (existingToken && existingToken.refreshToken) {
    const { token: newAccessToken, expiresAt, refreshToken } = await refreshTikTokToken(existingToken.refreshToken, config);
    tokenManager.setToken(newAccessToken, expiresAt, refreshToken);
    await saveConfig(config);
    return newAccessToken;
  }

  const userAccessToken = await promptForUserToken();
  tokenManager.setToken(userAccessToken, DateTime.now().plus({ days: 30 }).toISO());
  await saveConfig(config);
  return userAccessToken;
}

module.exports = { getTikTokToken };