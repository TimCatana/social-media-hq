const axios = require('axios');
const { DateTime } = require('luxon');
const prompts = require('prompts');
const { TokenManager } = require('./authUtils');

const TOKEN_GROUP = 'YouTube';
const tokenManager = new TokenManager();

async function exchangeCodeForTokens(code) {
  try {
    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      { grant_type: 'authorization_code', code, redirect_uri: 'http://localhost:3000', client_id: process.env.APP_ID, client_secret: process.env.APP_SECRET },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token, refresh_token, expires_in } = response.data;
    const expiresAt = DateTime.now().plus({ seconds: expires_in }).toISO();
    console.log(`YouTube code exchanged. Expires: ${expiresAt}`);
    return { accessToken: access_token, refreshToken: refresh_token, expiresAt };
  } catch (error) {
    console.error(`Failed to exchange YouTube code: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

async function refreshToken(tokenData) {
  try {
    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      { grant_type: 'refresh_token', refresh_token: tokenData.refreshToken, client_id: process.env.APP_ID, client_secret: process.env.APP_SECRET },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token, expires_in } = response.data;
    const expiresAt = DateTime.now().plus({ seconds: expires_in }).toISO();
    console.log(`YouTube token refreshed. Expires: ${expiresAt}`);
    return { accessToken: access_token, refreshToken: tokenData.refreshToken, expiresAt };
  } catch (error) {
    console.error(`Failed to refresh YouTube token: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

async function promptForToken() {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.APP_ID}&redirect_uri=http://localhost:3000&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload&access_type=offline&prompt=consent`;
  console.log(`Authorize YouTube: ${authUrl}`);
  const { code } = await prompts({
    type: 'text',
    name: 'code',
    message: 'Enter the code from the redirect URL:',
    validate: v => !!v || 'Required',
  }, { onCancel: () => process.exit(1) });
  return await exchangeCodeForTokens(code);
}

async function getYouTubeToken() {
  return await tokenManager.getToken(TOKEN_GROUP, {
    checkEnvVars: () => {
      if (!process.env.APP_ID || !process.env.APP_SECRET) {
        console.error('Missing APP_ID or APP_SECRET in .env for YouTube');
        process.exit(1);
      }
    },
    promptForToken,
    refreshToken,
    refreshThreshold: 1,
    timeUnit: 'hours',
  });
}

module.exports = { getYouTubeToken };