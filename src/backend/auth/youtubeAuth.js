const prompts = require('prompts');
const axios = require('axios');
const { DateTime } = require('luxon');
const { TokenManager, saveConfig } = require('./authUtils');
const { log } = require('../logging/logUtils'); // Updated to logUtils

async function promptForUserToken() {
  const { userAccessToken } = await prompts({
    type: 'text',
    name: 'userAccessToken',
    message: 'Enter a User Access Token for YouTube (from Google Developer Console with youtube.upload scope):',
    validate: v => v === '' || !!v || 'A valid User Access Token is required',
  }, { onCancel: () => { throw new Error('User cancelled token prompt'); } });

  if (userAccessToken === '') {
    log('INFO', 'YouTubeAuth: User pressed Enter to go back');
    throw new Error('User chose to go back');
  }

  log('INFO', `YouTubeAuth: Prompted user token: ${userAccessToken.substring(0, 10)}...`);
  return userAccessToken;
}

async function refreshYouTubeToken(refreshToken, config) {
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET
    });
    const newAccessToken = response.data.access_token;
    const expiresIn = response.data.expires_in;
    log('INFO', `YouTubeAuth: Refreshed token: ${newAccessToken.substring(0, 10)}... (expires in ${expiresIn} seconds)`);
    return { token: newAccessToken, expiresAt: DateTime.now().plus({ seconds: expiresIn }).toISO() };
  } catch (error) {
    log('ERROR', `YouTubeAuth: Failed to refresh token: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

async function getYouTubeToken(config) {
  const tokenManager = new TokenManager('youtube', config);
  const existingToken = tokenManager.getToken();

  if (existingToken && DateTime.fromISO(existingToken.expiresAt) > DateTime.now().plus({ days: 5 })) {
    log('INFO', `YouTubeAuth: Using existing token: ${existingToken.token.substring(0, 10)}...`);
    return existingToken.token;
  }

  if (existingToken && existingToken.refreshToken) {
    const { token: newAccessToken, expiresAt } = await refreshYouTubeToken(existingToken.refreshToken, config);
    tokenManager.setToken(newAccessToken, expiresAt, existingToken.refreshToken);
    await saveConfig(config);
    return newAccessToken;
  }

  const userAccessToken = await promptForUserToken();
  tokenManager.setToken(userAccessToken, DateTime.now().plus({ hours: 1 }).toISO());
  await saveConfig(config);
  return userAccessToken;
}

module.exports = { getYouTubeToken };