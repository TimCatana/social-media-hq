const path = require('path');
const { promptForPlatform, promptForCsvPath } = require('../utils/promptUtils');
const { log } = require('../utils/logUtils');
const { loadConfig } = require('../utils/configUtils');
const { displayCsvFormat } = require('../utils/csvUtils');

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

async function handleScheduling(config, verbose = false) {
  const platform = await promptForPlatform('scheduling');
  if (platform === 'back') return;

  displayCsvFormat(platform);
  const csvPath = await promptForCsvPath(platform, path.join(__dirname, '..', '..', 'bin', 'csv'));
  log('INFO', `Scheduling ${platform} posts from ${csvPath}`);

  try {
    const initializedPosts = await SCHEDULERS[platform](csvPath, config, verbose); // Pass verbose
    log('INFO', `Initialized ${initializedPosts} posts for scheduling; scheduler will handle uploads`);
  } catch (error) {
    log('ERROR', `Failed to initialize ${platform} posts: ${error.message}`);
    throw error;
  }
}

module.exports = { handleScheduling };