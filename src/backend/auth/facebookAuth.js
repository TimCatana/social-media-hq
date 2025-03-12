const prompts = require('prompts');
const axios = require('axios');
const { DateTime } = require('luxon');
const { TokenManager, saveConfig } = require('../utils/authUtils');
const { log } = require('../utils/logUtils');

async function promptForUserToken() {
  const { userAccessToken } = await prompts({
    type: 'text',
    name: 'userAccessToken',
    message: 'Enter a User Access Token for Facebook (from Graph API Explorer with publish_pages and manage_pages permissions):',
    validate: v => v === '' || !!v || 'A valid User Access Token is required',
  }, { onCancel: () => { throw new Error('User cancelled token prompt'); } });

  if (userAccessToken === '') {
    log('INFO', 'FacebookAuth: User pressed Enter to go back');
    throw new Error('User chose to go back');
  }

  log('INFO', `FacebookAuth: Prompted user token: ${userAccessToken.substring(0, 10)}...`);
  return userAccessToken;
}

async function exchangeForLongLivedToken(shortLivedToken, config) {
  try {
    const response = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: config.platforms.facebook.APP_ID,
        client_secret: config.platforms.facebook.APP_SECRET,
        fb_exchange_token: shortLivedToken
      }
    });
    const longLivedToken = response.data.access_token;
    const expiresIn = response.data.expires_in;
    log('INFO', `FacebookAuth: Exchanged for long-lived token: ${longLivedToken.substring(0, 10)}... (expires in ${expiresIn} seconds)`);
    return { token: longLivedToken, expiresAt: DateTime.now().plus({ seconds: expiresIn }).toISO() };
  } catch (error) {
    log('ERROR', `FacebookAuth: Failed to exchange token: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

async function getFacebookToken(config) {
  const tokenManager = new TokenManager('facebook', config);

  if (tokenManager.isTokenValid()) {
    log('INFO', `FacebookAuth: Using existing token: ${tokenManager.getToken().token.substring(0, 10)}...`);
    return tokenManager.getToken().token;
  }

  const shortLivedToken = await promptForUserToken();
  const { token: longLivedToken, expiresAt } = await exchangeForLongLivedToken(shortLivedToken, config);

  tokenManager.setToken(longLivedToken, expiresAt);
  await saveConfig(config);
  return longLivedToken;
}

module.exports = { getFacebookToken };