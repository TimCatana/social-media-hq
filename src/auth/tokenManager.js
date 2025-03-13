const { DateTime } = require('luxon');
const { log } = require('../utils/logUtils');
const { saveConfig } = require('../utils/configUtils');

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
    const tokenData = { token, expiresAt };
    if (refreshToken) tokenData.refreshToken = refreshToken;
    this.config.tokens[this.platform] = tokenData;
    log('INFO', `${this.platform} token set: ${token.substring(0, 10)}... (expires at ${expiresAt})`);
  }

  isTokenValid(bufferDays = 5) {
    const tokenData = this.getToken();
    if (!tokenData || !tokenData.token) return false;
    const expiresAt = DateTime.fromISO(tokenData.expiresAt);
    const isValid = expiresAt > DateTime.now().plus({ days: bufferDays });
    log('DEBUG', `${this.platform} token validity check: ${isValid} (expires ${tokenData.expiresAt})`);
    return isValid;
  }

  async save() {
    await saveConfig(this.config);
  }
}

module.exports = { TokenManager };