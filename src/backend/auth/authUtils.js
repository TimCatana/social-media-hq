const fs = require('fs').promises;
const path = require('path');
const { log } = require('../logging/logUtils');

const CONFIG_PATH = path.join(__dirname, '..', '..', '..', 'json', 'config.json'); // Two levels up from authUtils.js

async function loadConfig() {
  try {
    const configData = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    log('ERROR', `authUtils: Config file not found, returning empty tokens: ${error.message}`);
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

  setToken(token, expiresAt) {
    this.config.tokens[this.platform] = { token, expiresAt };
  }
}

module.exports = { loadConfig, saveConfig, TokenManager };