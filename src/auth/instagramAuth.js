const { DateTime } = require('luxon');
const prompts = require('prompts');
const axios = require('axios');
const { TokenManager, loadConfig, saveConfig } = require('./authUtils');

const TOKEN_GROUP = 'Instagram';
const tokenManager = new TokenManager();

async function promptForUserToken() {
  const { userAccessToken } = await prompts({
    type: 'text',
    name: 'userAccessToken',
    message: 'Enter a short-lived User Access Token for Instagram/Threads (from Graph API Explorer with instagram_basic and instagram_content_publish permissions):',
    validate: v => !!v || 'A valid User Access Token is required',
  }, { onCancel: () => process.exit(1) });
  console.log(`InstagramAuth: Prompted short-lived token: ${userAccessToken.substring(0, 10)}...`);
  return userAccessToken;
}

async function exchangeForLongLivedUserToken(shortLivedToken) {
  const appId = process.env.APP_ID;
  const appSecret = process.env.APP_SECRET;
  const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
  
  try {
    const response = await axios.get(url);
    const { access_token, expires_in } = response.data;
    const expiresAt = DateTime.now().plus({ seconds: expires_in }).toISO();
    console.log(`InstagramAuth: Exchanged for long-lived user token: ${access_token.substring(0, 10)}..., expires in ${expires_in} seconds`);
    return { accessToken: access_token, expiresAt };
  } catch (error) {
    console.error(`InstagramAuth: Failed to exchange user token: ${error.response?.data?.error?.message || error.message}`);
    throw new Error('Could not exchange short-lived user token for long-lived token');
  }
}

async function getInstagramToken(config) {
  const options = {
    checkEnvVars: () => {
      if (!process.env.APP_ID || !process.env.APP_SECRET) {
        console.error('Missing APP_ID or APP_SECRET in .env for Instagram');
        process.exit(1);
      }
    },
    promptForToken: async () => {
      const shortLivedToken = await promptForUserToken();
      return await exchangeForLongLivedUserToken(shortLivedToken);
    },
    refreshToken: null,
    validateToken: null,
    refreshThreshold: 5,
    warningThreshold: 10,
    timeUnit: 'days',
  };

  console.log(`InstagramAuth: Fetching token for ${TOKEN_GROUP} with stored data: ${JSON.stringify(config.tokens[TOKEN_GROUP])}`);
  const tokenData = await tokenManager.getToken(TOKEN_GROUP, options, config.tokens[TOKEN_GROUP]);
  console.log(`InstagramAuth: TokenManager returned: ${JSON.stringify(tokenData)}`);
  config.tokens[TOKEN_GROUP] = tokenData;
  const token = tokenData.accessToken;
  console.log(`InstagramAuth: Returning token: ${token ? token.substring(0, 10) : 'undefined'}...`);
  return token;
}

module.exports = { getInstagramToken };