const prompts = require('prompts');
const axios = require('axios');
const { DateTime } = require('luxon');
const { TokenManager, saveConfig } = require('./authUtils');
const { log } = require('../logging/logUtils'); // Updated to logUtils

async function promptForUserToken() {
  const { userAccessToken } = await prompts({
    type: 'text',
    name: 'userAccessToken',
    message: 'Enter a User Access Token for Pinterest (from Pinterest Developer Portal with pins scope):',
    validate: v => v === '' || !!v || 'A valid User Access Token is required',
  }, { onCancel: () => { throw new Error('User cancelled token prompt'); } });

  if (userAccessToken === '') {
    log('INFO', 'PinterestAuth: User pressed Enter to go back');
    throw new Error('User chose to go back');
  }

  log('INFO', `PinterestAuth: Prompted user token: ${userAccessToken.substring(0, 10)}...`);
  return userAccessToken;
}

async function refreshPinterestToken(refreshToken, config) {
  try {
    const response = await axios.post('https://api.pinterest.com/v5/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.PINTEREST_APP_ID,
      client_secret: process.env.PINTEREST_APP_SECRET
    });
    const newAccessToken = response.data.access_token;
    const expiresIn = response.data.expires_in;
    log('INFO', `PinterestAuth: Refreshed token: ${newAccessToken.substring(0, 10)}... (expires in ${expiresIn} seconds)`);
    return { token: newAccessToken, expiresAt: DateTime.now().plus({ seconds: expiresIn }).toISO() };
  } catch (error) {
    log('ERROR', `PinterestAuth: Failed to refresh token: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

async function getPinterestToken(config) {
  const tokenManager = new TokenManager('pinterest', config);
  const existingToken = tokenManager.getToken();

  if (existingToken && DateTime.fromISO(existingToken.expiresAt) > DateTime.now().plus({ days: 5 })) {
    log('INFO', `PinterestAuth: Using existing token: ${existingToken.token.substring(0, 10)}...`);
    return existingToken.token;
  }

  if (existingToken && existingToken.refreshToken) {
    const { token: newAccessToken, expiresAt } = await refreshPinterestToken(existingToken.refreshToken, config);
    tokenManager.setToken(newAccessToken, expiresAt, existingToken.refreshToken);
    await saveConfig(config);
    return newAccessToken;
  }

  const userAccessToken = await promptForUserToken();
  tokenManager.setToken(userAccessToken, DateTime.now().plus({ days: 30 }).toISO());
  await saveConfig(config);
  return userAccessToken;
}

module.exports = { getPinterestToken };