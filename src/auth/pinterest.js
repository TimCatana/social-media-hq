const axios = require('axios');
const { promptForToken } = require('../utils/promptUtils');
const { log } = require('../utils/logUtils');
const { DateTime } = require('luxon');
const { TokenManager } = require('./tokenManager');

async function refreshPinterestToken(refreshToken, config) {
  try {
    const response = await axios.post('https://api.pinterest.com/v5/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.platforms.pinterest.PINTEREST_APP_ID,
      client_secret: config.platforms.pinterest.PINTEREST_APP_SECRET,
    });
    return {
      token: response.data.access_token,
      expiresAt: DateTime.now().plus({ seconds: response.data.expires_in }).toISO(),
      refreshToken: response.data.refresh_token,
    };
  } catch (error) {
    log('ERROR', `Pinterest token refresh failed: ${error.response?.data?.error?.message || error.message}`);
    throw error;
  }
}

async function getPinterestToken(config) {
  const tokenManager = new TokenManager('pinterest', config);
  const existingToken = tokenManager.getToken();

  if (tokenManager.isTokenValid()) {
    log('INFO', `Using existing Pinterest token: ${existingToken.token.substring(0, 10)}...`);
    return existingToken.token;
  }

  if (existingToken?.refreshToken) {
    const { token, expiresAt, refreshToken } = await refreshPinterestToken(existingToken.refreshToken, config);
    tokenManager.setToken(token, expiresAt, refreshToken);
    await tokenManager.save();
    return token;
  }

  const userAccessToken = await promptForToken('Pinterest', 'pins scope');
  tokenManager.setToken(userAccessToken, DateTime.now().plus({ days: 30 }).toISO());
  await tokenManager.save();
  return userAccessToken;
}

module.exports = { getPinterestToken };