
const fs = require('fs').promises;
const path = require('path');
const { log } = require('./logUtils');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'json', 'config.json');

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf8');
    const config = JSON.parse(data);
    log('DEBUG', 'Config loaded successfully');
    return config;
  } catch (error) {
    log('INFO', `Config file not found, initializing empty config: ${error.message}`);
    return { tokens: {}, platforms: {} };
  }
}

async function saveConfig(config) {
  try {
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
    log('INFO', 'Config saved successfully');
  } catch (error) {
    log('ERROR', `Failed to save config: ${error.message}`);
    throw error;
  }
}

module.exports = { loadConfig, saveConfig };