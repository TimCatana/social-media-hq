const { DateTime } = require('luxon');
const prompts = require('prompts');
const axios = require('axios');
const { TokenManager } = require('./authUtils');

const TOKEN_GROUP = 'Pinterest';
const tokenManager = new TokenManager();

async function promptForToken() {
  const clientId = process.env.PINTEREST_CLIENT_ID;
  const redirectUri = 'urn:ietf:wg:oauth:2.0:oob'; // Out-of-band redirect URI for CLI
  const scope = 'read_public write_public'; // Scopes needed for reading and posting pins

  // Construct the authorization URL
  const authUrl = `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;

  console.log(`Please visit this URL to authorize the application: ${authUrl}`);
  const { code } = await prompts({
    type: 'text',
    name: 'code',
    message: 'Enter the authorization code displayed on the page:',
    validate: v => !!v || 'Authorization code is required',
  }, { onCancel: () => process.exit(1) });

  // Exchange the authorization code for access and refresh tokens
  const tokenUrl = 'https://api.pinterest.com/v5/oauth/token';
  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('client_id', clientId);
  params.append('client_secret', process.env.PINTEREST_CLIENT_SECRET);
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
    console.error(`Failed to exchange code for tokens: ${error.response?.data?.message || error.message}`);
    throw new Error('Could not obtain tokens');
  }
}

async function refreshToken(tokenData) {
  const clientId = process.env.PINTEREST_CLIENT_ID;
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET;
  const refreshToken = tokenData.refreshToken;

  const tokenUrl = 'https://api.pinterest.com/v5/oauth/token';
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('refresh_token', refreshToken);

  try {
    const response = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const { access_token, expires_in } = response.data;
    const expiresAt = DateTime.now().plus({ seconds: expires_in }).toISO();
    // Keep the existing refresh token since Pinterest doesn't issue a new one
    return { accessToken: access_token, refreshToken: refreshToken, expiresAt };
  } catch (error) {
    console.error(`Failed to refresh token: ${error.response?.data?.message || error.message}`);
    return null; // Returning null triggers reauthorization via promptForToken
  }
}

async function getPinterestToken(config) {
  const options = {
    checkEnvVars: () => {
      if (!process.env.PINTEREST_CLIENT_ID || !process.env.PINTEREST_CLIENT_SECRET) {
        console.error('Missing PINTEREST_CLIENT_ID or PINTEREST_CLIENT_SECRET in .env');
        process.exit(1);
      }
    },
    promptForToken,
    refreshToken,
    validateToken: null, // Rely on expiration time instead
    refreshThreshold: 5, // Refresh if within 5 days of expiration
    warningThreshold: 10, // Warn if within 10 days
    timeUnit: 'days',
  };

  const tokenData = await tokenManager.getToken(TOKEN_GROUP, options, config.tokens[TOKEN_GROUP]);
  config.tokens[TOKEN_GROUP] = tokenData; // Update config with new token data
  return tokenData.accessToken;
}

module.exports = { getPinterestToken };