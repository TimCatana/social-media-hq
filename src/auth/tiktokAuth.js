const { DateTime } = require('luxon');
const prompts = require('prompts');
const axios = require('axios');
const { TokenManager } = require('./authUtils');

const TOKEN_GROUP = 'TikTok';
const tokenManager = new TokenManager();

async function promptForToken() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = 'urn:ietf:wg:oauth:2.0:oob'; // CLI out-of-band redirect
  const scope = 'video.upload,user.info.basic'; // Scopes for posting videos

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&response_type=code&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  console.log(`Please visit this URL to authorize the application: ${authUrl}`);
  
  const { code } = await prompts({
    type: 'text',
    name: 'code',
    message: 'Enter the authorization code from TikTok:',
    validate: v => !!v || 'Authorization code is required'
  }, { onCancel: () => process.exit(1) });

  const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
  const params = new URLSearchParams();
  params.append('client_key', clientKey);
  params.append('client_secret', process.env.TIKTOK_CLIENT_SECRET);
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', redirectUri);

  try {
    const response = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const { access_token, refresh_token, expires_in } = response.data;
    const expiresAt = DateTime.now().plus({ seconds: expires_in }).toISO();
    return { accessToken: access_token, refreshToken: refresh_token, expiresAt };
  } catch (error) {
    console.error(`Failed to exchange code for tokens: ${error.response?.data?.error?.message || error.message}`);
    throw new Error('Could not obtain TikTok tokens');
  }
}

async function refreshToken(tokenData) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const refreshToken = tokenData.refreshToken;

  const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
  const params = new URLSearchParams();
  params.append('client_key', clientKey);
  params.append('client_secret', clientSecret);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);

  try {
    const response = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const { access_token, expires_in } = response.data;
    const expiresAt = DateTime.now().plus({ seconds: expires_in }).toISO();
    return { accessToken: access_token, refreshToken: refreshToken, expiresAt };
  } catch (error) {
    console.error(`Failed to refresh TikTok token: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

async function getTikTokToken(config) {
  const options = {
    checkEnvVars: () => {
      if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) {
        console.error('Missing TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET in .env');
        process.exit(1);
      }
    },
    promptForToken,
    refreshToken,
    validateToken: null,
    refreshThreshold: 5,
    warningThreshold: 10,
    timeUnit: 'days'
  };

  const tokenData = await tokenManager.getToken(TOKEN_GROUP, options, config.tokens[TOKEN_GROUP]);
  config.tokens[TOKEN_GROUP] = tokenData;
  return tokenData.accessToken;
}

module.exports = { getTikTokToken };