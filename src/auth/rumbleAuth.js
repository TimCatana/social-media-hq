const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { DateTime } = require('luxon');
const prompts = require('prompts');

const CONFIG_FILE = path.join(__dirname, '..', '..', 'json', 'token-config.json');
const TOKEN_GROUP = 'YouTube';

async function loadConfig() {
  try {
    if (await fs.access(CONFIG_FILE).then(() => true).catch(() => false)) {
      return JSON.parse(await fs.readFile(CONFIG_FILE, 'utf-8'));
    }
    return { tokens: {} };
  } catch (error) {
    console.error(`Failed to load config file ${CONFIG_FILE}: ${error.message}`);
    return { tokens: {} };
  }
}

async function saveConfig(config) {
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`Saved config to ${CONFIG_FILE}`);
  } catch (error) {
    console.error(`Failed to save config to ${CONFIG_FILE}: ${error.message}`);
  }
}

async function exchangeYouTubeCodeForTokens(code) {
  try {
    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:3000',
        client_id: process.env.APP_ID,
        client_secret: process.env.APP_SECRET,
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    const { access_token, refresh_token, expires_in } = response.data;
    const expiresAt = DateTime.now().plus({ seconds: expires_in }).toISO();
    console.log(`YouTube code exchanged for tokens. Access token expires: ${expiresAt}`);
    return { accessToken: access_token, refreshToken: refresh_token, expiresAt };
  } catch (error) {
    console.error(`Failed to exchange YouTube code: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

async function refreshYouTubeToken(refreshToken) {
  try {
    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.APP_ID,
        client_secret: process.env.APP_SECRET,
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    const { access_token, expires_in } = response.data;
    const expiresAt = DateTime.now().plus({ seconds: expires_in }).toISO();
    console.log(`YouTube access token refreshed. New expiration: ${expiresAt}`);
    return { accessToken: access_token, refreshToken: refreshToken, expiresAt };
  } catch (error) {
    console.error(`Failed to refresh YouTube token: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

async function promptForYouTubeToken() {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.APP_ID}&redirect_uri=http://localhost:3000&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload&access_type=offline&prompt=consent`;
  console.log(`Please visit this URL to authorize YouTube: ${authUrl}`);
  const { code } = await prompts({
    type: 'text',
    name: 'code',
    message: 'Enter the code from the redirect URL after authorization:',
    validate: v => !!v || 'Required',
  }, { onCancel: () => process.exit(1) });
  return await exchangeYouTubeCodeForTokens(code);
}

async function getYouTubeToken() {
  if (!process.env.APP_ID || !process.env.APP_SECRET) {
    console.error('Missing APP_ID or APP_SECRET in .env for YouTube');
    process.exit(1);
  }

  let config = await loadConfig();
  let tokenData = config.tokens && config.tokens[TOKEN_GROUP];
  const now = DateTime.now();

  if (!tokenData || !tokenData.accessToken || !tokenData.refreshToken || !tokenData.expiresAt) {
    console.warn(`No token found for ${TOKEN_GROUP} in ${CONFIG_FILE}`);
    tokenData = await promptForYouTubeToken();
    config.tokens = config.tokens || {};
    config.tokens[TOKEN_GROUP] = tokenData;
    await saveConfig(config);
  }

  const expiresAt = DateTime.fromISO(tokenData.expiresAt);
  if (expiresAt < now) {
    console.info(`${TOKEN_GROUP} access token has expired, attempting to refresh...`);
    const refreshed = await refreshYouTubeToken(tokenData.refreshToken);
    if (refreshed) {
      config.tokens[TOKEN_GROUP] = refreshed;
      await saveConfig(config);
    } else {
      console.error(`${TOKEN_GROUP} refresh failed. Please reauthorize.`);
      tokenData = await promptForYouTubeToken();
      config.tokens[TOKEN_GROUP] = tokenData;
      await saveConfig(config);
    }
  } else {
    const hoursUntilExpiry = expiresAt.diff(now, 'hours').hours;
    if (hoursUntilExpiry <= 1) {
      console.info(`${TOKEN_GROUP} access token expires in ${hoursUntilExpiry.toFixed(1)} hours, refreshing...`);
      const refreshed = await refreshYouTubeToken(tokenData.refreshToken);
      if (refreshed) {
        config.tokens[TOKEN_GROUP] = refreshed;
        await saveConfig(config);
      }
    } else {
      console.info(`${TOKEN_GROUP} access token still valid for ${hoursUntilExpiry.toFixed(1)} hours`);
    }
  }

  return config.tokens[TOKEN_GROUP].accessToken;
}

module.exports = { getYouTubeToken };