const axios = require('axios');
const { promptForToken } = require('../utils/promptUtils');
const { log } = require('../utils/logUtils');
const { DateTime } = require('luxon');
const { TokenManager } = require('./tokenManager');

// Note: This serves both Instagram and Threads as they share the same auth
async function exchangeForLongLivedToken(shortLivedToken, config) {
  try {
    const response = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: config.platforms.instagram.APP_ID,
        client_secret: config.platforms.instagram.APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    });
    return {
      token: response.data.access_token,
      expiresAt: DateTime.now().plus({ seconds: response.data.expires_in }).toISO(),
    };
  } catch (error) {
    log('ERROR', `Instagram token exchange failed: ${error.response?.data?.error?.message || error.message}`);
    throw error;
  }
}

async function getInstagramToken(config, platform = 'instagram') {
  const tokenKey = platform === 'threads' ? 'instagram-threads' : 'instagram';
  const tokenManager = new TokenManager(tokenKey, config);

  if (tokenManager.isTokenValid()) {
    log('INFO', `Using existing ${platform} token: ${tokenManager.getToken().token.substring(0, 10)}...`);
    return tokenManager.getToken().token;
  }

  const shortLivedToken = await promptForToken(
    platform === 'threads' ? 'Threads' : 'Instagram',
    'instagram_basic and instagram_content_publish permissions'
  );
  const { token, expiresAt } = await exchangeForLongLivedToken(shortLivedToken, config);

  tokenManager.setToken(token, expiresAt);
  await tokenManager.save();
  return token;
}

// Export both Instagram and Threads tokens (Threads uses Instagram auth)
module.exports = {
  getInstagramToken: config => getInstagramToken(config, 'instagram'),
  getThreadsToken: config => getInstagramToken(config, 'threads'),
};