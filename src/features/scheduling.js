const path = require('path');
const { promptForPlatform, promptForCsvPath } = require('../utils/promptUtils');
const { log } = require('../utils/logUtils');
const { loadConfig } = require('../utils/configUtils');
const { displayCsvFormat } = require('../utils/csvUtils');
const { startScheduler } = require('../utils/scheduleUtils');
const {
  ensureFacebookAuth, ensureInstagramAuth, ensurePinterestAuth, ensureRumbleAuth,
  ensureThreadsAuth, ensureTikTokAuth, ensureTwitterAuth, ensureYouTubeAuth,
} = require('../utils/authUtils');

const SCHEDULERS = {
  facebook: require('../platforms/facebook/scheduling').scheduleFacebookPosts,
  instagram: require('../platforms/instagram/scheduling').scheduleInstagramPosts,
  pinterest: require('../platforms/pinterest/scheduling').schedulePinterestPosts,
  rumble: require('../platforms/rumble/scheduling').scheduleRumblePosts,
  threads: require('../platforms/threads/scheduling').scheduleThreadsPosts,
  tiktok: require('../platforms/tiktok/scheduling').scheduleTikTokPosts,
  twitter: require('../platforms/twitter/scheduling').scheduleTwitterPosts,
  youtube: require('../platforms/youtube/scheduling').scheduleYouTubePosts,
};

const AUTH_FUNCTIONS = {
  facebook: ensureFacebookAuth,
  instagram: ensureInstagramAuth,
  pinterest: ensurePinterestAuth,
  rumble: ensureRumbleAuth,
  threads: ensureThreadsAuth,
  tiktok: ensureTikTokAuth,
  twitter: ensureTwitterAuth,
  youtube: ensureYouTubeAuth,
};

async function handleScheduling(config, verbose = false) {
  const platform = await promptForPlatform('scheduling');
  if (platform === 'back') return;

  // Authenticate first, before any other prompts
  log('INFO', `Checking ${platform} authentication...`);
  await AUTH_FUNCTIONS[platform](config);

  displayCsvFormat(platform);
  const csvPath = await promptForCsvPath(platform, path.join(__dirname, '..', '..', 'bin', 'csv'));
  log('INFO', `Scheduling ${platform} posts from ${csvPath}`);

  try {
    const initializedPosts = await SCHEDULERS[platform](csvPath, config, verbose);
    log('INFO', `Initialized ${initializedPosts.posts.length} posts for scheduling; starting persistent scheduler`);
    await startScheduler(config, verbose); // Start the persistent scheduler
  } catch (error) {
    log('ERROR', `Failed to initialize ${platform} posts: ${error.message}`);
    throw error;
  }
}

module.exports = { handleScheduling };