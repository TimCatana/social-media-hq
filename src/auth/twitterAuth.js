const axios = require('axios');
const { DateTime } = require('luxon');
const prompts = require('prompts');
const { TokenManager } = require('./authUtils');

const TOKEN_GROUP = 'Twitter';
const tokenManager = new TokenManager();

async function exchangeCodeForTokens(code) {
  try {
    const response = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      { grant_type: 'authorization_code', code, redirect_uri: 'http://localhost:3000', client_id: process.env.TWITTER_CLIENT_ID, code_verifier: 'challenge' },
      {
        auth: { username: process.env.TWITTER_CLIENT_ID, password: process.env.TWITTER_CLIENT_SECRET },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );
    const { access_token, refresh_token, expires_in } = response.data;
    const expiresAt = DateTime.now().plus({ seconds: expires_in }).toISO();
    console.log(`Twitter code exchanged. Expires: ${expiresAt}`);
    return { accessToken: access_token, refreshToken: refresh_token, expiresAt };
  } catch (error) {
    console.error(`Failed to exchange Twitter code: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

async function refreshToken(tokenData) {
  try {
    const response = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      { grant_type: 'refresh_token', refresh_token: tokenData.refreshToken, client_id: process.env.TWITTER_CLIENT_ID },
      {
        auth: { username: process.env.TWITTER_CLIENT_ID, password: process.env.TWITTER_CLIENT_SECRET },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );
    const { access_token, refresh_token, expires_in } = response.data;
    const expiresAt = DateTime.now().plus({ seconds: expires_in }).toISO();
    console.log(`Twitter token refreshed. Expires: ${expiresAt}`);
    return { accessToken: access_token, refreshToken: refresh_token || tokenData.refreshToken, expiresAt };
  } catch (error) {
    console.error(`Failed to refresh Twitter token: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

async function promptForToken() {
  const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_CLIENT_ID}&redirect_uri=http://localhost:3000&scope=tweet.write%20tweet.read%20users.read%20offline.access&state=state&code_challenge=challenge&code_challenge_method=plain`;
  console.log(`Authorize Twitter: ${authUrl}`);
  const { code } = await prompts({
    type: 'text',
    name: 'code',
    message: 'Enter the code from the redirect URL:',
    validate: v => !!v || 'Required',
  }, { onCancel: () => process.exit(1) });
  return await exchangeCodeForTokens(code);
}

async function getTwitterToken() {
  return await tokenManager.getToken(TOKEN_GROUP, {
    checkEnvVars: () => {
      if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
        console.error('Missing TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET in .env');
        process.exit(1);
      }
    },
    promptForToken,
    refreshToken,
    refreshThreshold: 1,
    timeUnit: 'hours',
  });
}

module.exports = { getTwitterToken };