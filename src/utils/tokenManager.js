const { DateTime } = require('luxon');
const { promptForToken } = require('./promptUtils');
const { log } = require('./logUtils');
const { saveConfig } = require('./configUtils');
const axios = require('axios');

class TokenManager {
  constructor(platform, config) {
    this.platform = platform;
    this.config = config;
    if (!this.config.tokens) this.config.tokens = {};
    if (!this.config.tokens[platform]) this.config.tokens[platform] = {};
  }

  getToken() {
    return this.config.tokens[this.platform];
  }

  isTokenValid() {
    const tokenData = this.getToken();
    if (!tokenData.token || !tokenData.expiresAt) return false;
    const expiresAt = DateTime.fromISO(tokenData.expiresAt);
    const now = DateTime.now();
    return expiresAt > now.plus({ days: 5 }); // 5-day buffer
  }

  setToken(token, expiresAt) {
    this.config.tokens[this.platform] = { token, expiresAt };
  }

  async save() {
    await saveConfig(this.config);
  }

  async ensureToken(tokenKey, scope, exchangeFn) {
    let token = this.getToken()?.token;
    if (!token || !this.isTokenValid()) {
      const shortLivedToken = await promptForToken(tokenKey, scope);
      if (exchangeFn) {
        const { token: newToken, expiresAt } = await exchangeFn(shortLivedToken);
        this.setToken(newToken, expiresAt);
        await this.save();
        return newToken;
      } else {
        this.setToken(shortLivedToken, DateTime.now().plus({ days: 30 }).toISO());
        await this.save();
        return shortLivedToken;
      }
    }
    return token;
  }
}

async function ensureFacebookToken(config) {
  const tm = new TokenManager('facebook', config);
  return await tm.ensureToken('Facebook', 'publish_pages and manage_pages permissions', async (shortLivedToken) => {
    const response = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
      params: { grant_type: 'fb_exchange_token', client_id: config.platforms.facebook.APP_ID, client_secret: config.platforms.facebook.APP_SECRET, fb_exchange_token: shortLivedToken },
    });
    return { token: response.data.access_token, expiresAt: DateTime.now().plus({ seconds: response.data.expires_in }).toISO() };
  });
}

async function ensureInstagramToken(config) {
  const tm = new TokenManager('instagram', config);
  return await tm.ensureToken('Instagram', 'instagram_basic and instagram_content_publish permissions', async (shortLivedToken) => {
    const response = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
      params: { grant_type: 'fb_exchange_token', client_id: config.platforms.instagram.APP_ID, client_secret: config.platforms.instagram.APP_SECRET, fb_exchange_token: shortLivedToken },
    });
    return { token: response.data.access_token, expiresAt: DateTime.now().plus({ seconds: response.data.expires_in }).toISO() };
  });
}

async function ensurePinterestToken(config) {
  const tm = new TokenManager('pinterest', config);
  return await tm.ensureToken('Pinterest', 'pins scope', null);
}

async function ensureRumbleToken(config) {
  const tm = new TokenManager('rumble', config);
  return await tm.ensureToken('Rumble', 'hypothetical API access', null);
}

async function ensureThreadsToken(config) {
  const tm = new TokenManager('instagram-threads', config);
  return await tm.ensureToken('Threads', 'instagram_basic and instagram_content_publish permissions', async (shortLivedToken) => {
    const response = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
      params: { grant_type: 'fb_exchange_token', client_id: config.platforms.instagram?.APP_ID, client_secret: config.platforms.instagram?.APP_SECRET, fb_exchange_token: shortLivedToken },
    });
    return { token: response.data.access_token, expiresAt: DateTime.now().plus({ seconds: response.data.expires_in }).toISO() };
  });
}

async function ensureTikTokToken(config) {
  const tm = new TokenManager('tiktok', config);
  return await tm.ensureToken('TikTok', 'video.publish scope', null);
}

async function ensureTwitterToken(config) {
  const tm = new TokenManager('x', config);
  return await tm.ensureToken('Twitter', 'tweet.write scope', null);
}

async function ensureYouTubeToken(config) {
  const tm = new TokenManager('youtube', config);
  return await tm.ensureToken('YouTube', 'youtube.upload scope', null);
}

module.exports = {
  TokenManager,
  ensureFacebookToken,
  ensureInstagramToken,
  ensurePinterestToken,
  ensureRumbleToken,
  ensureThreadsToken,
  ensureTikTokToken,
  ensureTwitterToken,
  ensureYouTubeToken,
};