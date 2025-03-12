const fs = require('fs').promises;
const path = require('path');
const { DateTime } = require('luxon');
const { log } = require('./logUtils');

// Adjusted to root/json/config.json
const CONFIG_PATH = path.join(__dirname, '..', '..', '..', 'json', 'config.json');

async function loadConfig() {
  try {
    const configData = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    log('INFO', `authUtils: Config file not found, initializing empty config: ${error.message}`);
    return { tokens: {} };
  }
}

async function saveConfig(config) {
  try {
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
    log('INFO', 'authUtils: Config saved successfully');
  } catch (error) {
    log('ERROR', `authUtils: Failed to save config: ${error.message}`);
    throw error;
  }
}

class TokenManager {
  constructor(platform, config) {
    this.platform = platform;
    this.config = config;
    if (!this.config.tokens) this.config.tokens = {};
  }

  getToken() {
    return this.config.tokens[this.platform];
  }

  setToken(token, expiresAt, refreshToken = null) {
    this.config.tokens[this.platform] = { token, expiresAt };
    if (refreshToken) this.config.tokens[this.platform].refreshToken = refreshToken;
  }

  isTokenValid() {
    const tokenData = this.getToken();
    return tokenData && DateTime.fromISO(tokenData.expiresAt) > DateTime.now().plus({ days: 5 });
  }
}

module.exports = { loadConfig, saveConfig, TokenManager };