const prompts = require('prompts');
const axios = require('axios');
const { DateTime } = require('luxon');
const { TokenManager, saveConfig } = require('./authUtils');
const { log } = require('../logging/logUtils'); // Updated to logUtils

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
        client_id: process.env.APP_ID,
        client_secret: process.env.APP_SECRET,
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
  const instagramThreadsTokenManager = new TokenManager('instagram-threads', config);
  const existingInstagramThreadsToken = instagramThreadsTokenManager.getToken();

  if (existingInstagramThreadsToken && DateTime.fromISO(existingInstagramThreadsToken.expiresAt) > DateTime.now().plus({ days: 5 })) {
    log('INFO', `InstagramThreadsAuth: Using existing token: ${existingInstagramThreadsToken.token.substring(0, 10)}...`);
    return existingInstagramThreadsToken.token;
  }

  const instagramThreadsShortLivedToken = await promptForInstagramThreadsUserToken();
  const { token: instagramThreadsLongLivedToken, expiresAt } = await exchangeForInstagramThreadsLongLivedToken(instagramThreadsShortLivedToken, config);

  instagramThreadsTokenManager.setToken(instagramThreadsLongLivedToken, expiresAt);
  await saveConfig(config);
  return instagramThreadsLongLivedToken;
}

module.exports = { getInstagramThreadsToken };