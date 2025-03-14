const { promptForText } = require('./promptUtils');
const { log } = require('./logUtils');
const { saveConfig } = require('./configUtils');

async function ensureConfig(config, platform, fields) {
  if (!config.platforms) config.platforms = {};
  if (!config.platforms[platform]) config.platforms[platform] = {};
  const platformConfig = config.platforms[platform];

  for (const { key, message } of fields) {
    if (!platformConfig[key]) {
      const { value } = await promptForText({ type: 'text', name: 'value', message, validate: v => !!v || 'Required' });
      platformConfig[key] = value;
      log('INFO', `Saved ${platform} ${key}: ${key.includes('SECRET') ? value.substring(0, 4) + '...' : value}`);
    }
  }
  await saveConfig(config);
  return platformConfig;
}

async function ensureFacebookConfig(config) {
  return await ensureConfig(config, 'facebook', [
    { key: 'APP_ID', message: 'Enter your Facebook App ID:' },
    { key: 'APP_SECRET', message: 'Enter your Facebook App Secret:' },
    { key: 'PAGE_ID', message: 'Enter your Facebook Page ID:' },
  ]);
}

async function ensureInstagramConfig(config) {
  return await ensureConfig(config, 'instagram', [
    { key: 'APP_ID', message: 'Enter your Instagram App ID:' },
    { key: 'APP_SECRET', message: 'Enter your Instagram App Secret:' },
    { key: 'INSTAGRAM_BUSINESS_ACCOUNT_ID', message: 'Enter your Instagram Business Account ID:' },
  ]);
}

async function ensurePinterestConfig(config) {
  return await ensureConfig(config, 'pinterest', [
    { key: 'PINTEREST_APP_ID', message: 'Enter your Pinterest App ID:' },
    { key: 'PINTEREST_APP_SECRET', message: 'Enter your Pinterest App Secret:' },
    { key: 'DEFAULT_BOARD_ID', message: 'Enter your Pinterest Default Board ID:' },
  ]);
}

async function ensureRumbleConfig(config) {
  return await ensureConfig(config, 'rumble', []); // No specific config needed
}

async function ensureThreadsConfig(config) {
  return await ensureConfig(config, 'threads', [
    { key: 'INSTAGRAM_BUSINESS_ACCOUNT_ID', message: 'Enter your Threads Instagram Business Account ID:' },
  ]);
}

async function ensureTikTokConfig(config) {
  return await ensureConfig(config, 'tiktok', [
    { key: 'TIKTOK_CLIENT_KEY', message: 'Enter your TikTok Client Key:' },
    { key: 'TIKTOK_CLIENT_SECRET', message: 'Enter your TikTok Client Secret:' },
  ]);
}

async function ensureTwitterConfig(config) {
  return await ensureConfig(config, 'twitter', []); // No specific config needed
}

async function ensureYouTubeConfig(config) {
  return await ensureConfig(config, 'youtube', [
    { key: 'YOUTUBE_CLIENT_ID', message: 'Enter your YouTube Client ID:' },
    { key: 'YOUTUBE_CLIENT_SECRET', message: 'Enter your YouTube Client Secret:' },
  ]);
}

module.exports = {
  ensureFacebookConfig,
  ensureInstagramConfig,
  ensurePinterestConfig,
  ensureRumbleConfig,
  ensureThreadsConfig,
  ensureTikTokConfig,
  ensureTwitterConfig,
  ensureYouTubeConfig,
};