const prompts = require('prompts');
const axios = require('axios');
const { DateTime } = require('luxon');
const { TokenManager, saveConfig } = require('../utils/authUtils');
const { log } = require('../utils/logUtils');

async function promptForInstagramThreadsUserToken() {
  const { instagramThreadsUserAccessToken } = await prompts({
    type: 'text',
    name: 'instagramThreadsUserAccessToken',
    message: 'Enter a short-lived User Access Token for Instagram/Threads (from Graph API Explorer with instagram_basic and instagram_content_publish permissions):',
    validate: v => v === '' || !!v || 'A valid User Access Token is required',
  }, { onCancel: () => { throw new Error('User cancelled token prompt'); } });

  if (instagramThreadsUserAccessToken === '') {
    log('INFO', 'InstagramThreadsAuth: User pressed Enter to go back');
    throw new Error('User chose to go back');
  }

  log('INFO', `InstagramThreadsAuth: Prompted short-lived token: ${instagramThreadsUserAccessToken.substring(0, 10)}...`);
  return instagramThreadsUserAccessToken;
}

async function exchangeForInstagramThreadsLongLivedToken(shortLivedToken, config) {
  try {
    const response = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: config.platforms.instagram.APP_ID, // Shared with Instagram
        client_secret: config.platforms.instagram.APP_SECRET,
        fb_exchange_token: shortLivedToken
      }
    });
    const instagramThreadsLongLivedToken = response.data.access_token;
    const expiresIn = response.data.expires_in;
    log('INFO', `InstagramThreadsAuth: Exchanged for long-lived token: ${instagramThreadsLongLivedToken.substring(0, 10)}... (expires in ${expiresIn} seconds)`);
    return { token: instagramThreadsLongLivedToken, expiresAt: DateTime.now().plus({ seconds: expiresIn }).toISO() };
  } catch (error) {
    log('ERROR', `InstagramThreadsAuth: Failed to exchange token: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

async function getInstagramThreadsToken(config) {
  const tokenManager = new TokenManager('instagram-threads', config);

  if (tokenManager.isTokenValid()) {
    log('INFO', `InstagramThreadsAuth: Using existing token: ${tokenManager.getToken().token.substring(0, 10)}...`);
    return tokenManager.getToken().token;
  }

  const shortLivedToken = await promptForInstagramThreadsUserToken();
  const { token: longLivedToken, expiresAt } = await exchangeForInstagramThreadsLongLivedToken(shortLivedToken, config);

  tokenManager.setToken(longLivedToken, expiresAt);
  await saveConfig(config);
  return longLivedToken;
}

module.exports = { getInstagramThreadsToken };