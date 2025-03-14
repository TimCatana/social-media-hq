const { promptForPlatform, promptForHashtag, promptForMetric } = require('../utils/promptUtils');
const { log } = require('../utils/logUtils');
const { METRICS } = require('../constants');
const {
  ensureFacebookAuth, ensureInstagramAuth, ensurePinterestAuth, ensureRumbleAuth,
  ensureThreadsAuth, ensureTikTokAuth, ensureTwitterAuth, ensureYouTubeAuth,
} = require('../utils/authUtils');

const FETCHERS = {
  facebook: require('../platforms/facebook/topPosts').getFacebookTopPosts,
  instagram: require('../platforms/instagram/topPosts').getInstagramTopPosts,
  pinterest: require('../platforms/pinterest/topPosts').getPinterestTopPosts,
  rumble: require('../platforms/rumble/topPosts').getRumbleTopPosts,
  threads: require('../platforms/threads/topPosts').getThreadsTopPosts,
  tiktok: require('../platforms/tiktok/topPosts').getTikTokTopPosts,
  twitter: require('../platforms/twitter/topPosts').getTwitterTopPosts,
  youtube: require('../platforms/youtube/topPosts').getYouTubeTopPosts,
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

async function handleTopPosts(config, verbose = false) {
  const platform = await promptForPlatform('top posts');
  if (platform === 'back') return;

  // Authenticate first, before any other prompts
  log('INFO', `Checking ${platform} authentication...`);
  await AUTH_FUNCTIONS[platform](config);

  const hashtag = await promptForHashtag(platform);
  if (hashtag === 'back') return;

  const metricChoices = METRICS[platform].map(m => ({ title: m, value: m }));
  const metric = await promptForMetric(metricChoices);
  if (metric === 'back') return;

  try {
    const filePath = await FETCHERS[platform](hashtag, metric, config, verbose);
    log('INFO', `Wrote top ${platform} posts to ${filePath}`);
    return filePath;
  } catch (error) {
    log('ERROR', `Failed to fetch top ${platform} posts: ${error.message}`);
    throw error;
  }
}

module.exports = { handleTopPosts };