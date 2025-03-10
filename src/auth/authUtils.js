const fs = require('fs').promises;
const path = require('path');
const { DateTime } = require('luxon');

const CONFIG_FILE = path.join(__dirname, '..', '..', 'json', 'token-config.json');

async function loadConfig() {
  try {
    if (await fs.access(CONFIG_FILE).then(() => true).catch(() => false)) {
      const config = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf-8'));
      console.log(`authUtils: Loaded config: ${JSON.stringify(config)}`);
      return config;
    }
    console.log('authUtils: Config file not found, returning empty tokens');
    return { tokens: {} };
  } catch (error) {
    console.error(`Failed to load config file ${CONFIG_FILE}: ${error.message}`);
    return { tokens: {} };
  }
}

async function saveConfig(config) {
  try {
    await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true }); // Ensure directory exists
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`authUtils: Saved config: ${JSON.stringify(config)}`);
  } catch (error) {
    console.error(`Failed to save config to ${CONFIG_FILE}: ${error.message}`);
  }
}

class TokenManager {
  async getToken(tokenGroup, options, storedTokenData) {
    const { checkEnvVars, promptForToken, refreshToken, validateToken, refreshThreshold, warningThreshold, timeUnit = 'days' } = options;
    checkEnvVars();

    let tokenData = storedTokenData;
    console.log(`TokenManager: Initial tokenData for ${tokenGroup}: ${JSON.stringify(tokenData)}`);
    const now = DateTime.now();

    if (!tokenData || !tokenData.accessToken || (tokenData.refreshToken && !tokenData.expiresAt)) {
      console.warn(`No token found for ${tokenGroup} in config`);
      tokenData = await promptForToken();
      console.log(`TokenManager: After prompt, tokenData for ${tokenGroup}: ${JSON.stringify(tokenData)}`);
    }

    const expiresAt = tokenData.expiresAt ? DateTime.fromISO(tokenData.expiresAt) : null;
    if (expiresAt && expiresAt < now) {
      console.info(`${tokenGroup} access token has expired`);
      if (validateToken) {
        const isValid = await validateToken(tokenData.accessToken);
        if (!isValid) {
          console.warn(`${tokenGroup} token is invalid or expired. Please provide a new token.`);
          tokenData = await promptForToken();
        }
      } else if (refreshToken) {
        console.info(`Attempting to refresh ${tokenGroup} token...`);
        const refreshed = await refreshToken(tokenData);
        if (refreshed) {
          tokenData = refreshed;
        } else {
          console.error(`Failed to refresh ${tokenGroup} token. Please reauthorize.`);
          tokenData = await promptForToken();
        }
      } else {
        console.warn(`${tokenGroup} token has expired and cannot be refreshed. Please provide a new token.`);
        tokenData = await promptForToken();
      }
    } else if (expiresAt) {
      const timeUntilExpiry = expiresAt.diff(now, timeUnit).toObject()[timeUnit];
      if (warningThreshold && timeUntilExpiry <= warningThreshold) {
        console.warn(`${tokenGroup} token expires in ${timeUntilExpiry.toFixed(1)} ${timeUnit}. Consider refreshing soon.`);
      }
      if (refreshThreshold && timeUntilExpiry <= refreshThreshold && refreshToken) {
        console.info(`${tokenGroup} token expires in ${timeUntilExpiry.toFixed(1)} ${timeUnit}, attempting to refresh...`);
        const refreshed = await refreshToken(tokenData);
        if (refreshed) {
          tokenData = refreshed;
        } else {
          console.warn(`Failed to refresh ${tokenGroup} token. Please provide a new token if issues arise.`);
        }
      } else {
        console.info(`${tokenGroup} token still valid for ${timeUntilExpiry.toFixed(1)} ${timeUnit}`);
      }
    }

    console.log(`TokenManager: Returning tokenData for ${tokenGroup}: ${JSON.stringify(tokenData)}`);
    return tokenData;
  }
}

module.exports = { loadConfig, saveConfig, TokenManager };