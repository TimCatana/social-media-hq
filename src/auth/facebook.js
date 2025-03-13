const axios = require('axios');
const { promptForToken } = require('../utils/promptUtils');
const { log } = require('../utils/logUtils');
const { DateTime } = require('luxon');
const { TokenManager } = require('./tokenManager');

async function exchangeForLongLivedToken(shortLivedToken, config) {
  try {
    const response = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: config.platforms.facebook.APP_ID,
        client_secret: config.platforms.facebook.APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    });
    return {
      token: response.data.access_token,
      expiresAt: DateTime.now().plus({ seconds: response.data.expires_in }).toISO(),
    };
  } catch (error) {
    log('ERROR', `Facebook token exchange failed: ${error.response?.data?.error?.message || error.message}`);
    throw error;
  }
}

async function getFacebookToken(config) {
  const tokenManager = new TokenManager('facebook', config);

  if (tokenManager.isTokenValid()) {
    log('INFO', `Using existing Facebook token: ${tokenManager.getToken().token.substring(0, 10)}...`);
    return tokenManager.getToken().token;
  }

  const shortLivedToken = await promptForToken('Facebook', 'publish_pages and manage_pages permissions');
  const { token, expiresAt } = await exchangeForLongLivedToken(shortLivedToken, config);

  tokenManager.setToken(token, expiresAt);
  await tokenManager.save();
  return token;
}

module.exports = { getFacebookToken };