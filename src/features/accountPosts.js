const { promptForPlatform, promptForAccount, promptForIsMyAccount, promptForMetric } = require('../utils/promptUtils');
const { log } = require('../utils/logUtils');
const { METRICS } = require('../constants');
const {
  ensureFacebookAuth, ensureInstagramAuth, ensurePinterestAuth, ensureRumbleAuth,
  ensureThreadsAuth, ensureTikTokAuth, ensureTwitterAuth, ensureYouTubeAuth,
} = require('../utils/authUtils');

const FETCHERS = {
  facebook: require('../platforms/facebook/accountPosts').getFacebookAccountPosts,
  instagram: require('../platforms/instagram/accountPosts').getInstagramAccountPosts,
  pinterest: require('../platforms/pinterest/accountPosts').getPinterestAccountPosts,
  rumble: require('../platforms/rumble/accountPosts').getRumbleAccountPosts,
  threads: require('../platforms/threads/accountPosts').getThreadsAccountPosts,
  tiktok: require('../platforms/tiktok/accountPosts').getTikTokAccountPosts,
  twitter: require('../platforms/twitter/accountPosts').getTwitterAccountPosts,
  youtube: require('../platforms/youtube/accountPosts').getYouTubeAccountPosts,
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

async function handleAccountPosts(config, verbose = false) {
  const platform = await promptForPlatform('account posts');
  if (platform === 'back') return;

  // Authenticate first, before any other prompts
  log('INFO', `Checking ${platform} authentication...`);
  await AUTH_FUNCTIONS[platform](config);

  const account = await promptForAccount(platform);
  if (account === 'back') return;

  const isMyAccount = await promptForIsMyAccount(platform);
  if (isMyAccount === 'back') return;

  const metricChoices = METRICS[platform].map(m => ({ title: m, value: m }));
  const metric = await promptForMetric(metricChoices);
  if (metric === 'back') return;

  try {
    const filePath = await FETCHERS[platform](account, isMyAccount, metric, config, verbose);
    log('INFO', `Wrote ${platform} posts to ${filePath}`);
    return filePath;
  } catch (error) {
    log('ERROR', `Failed to fetch ${platform} posts: ${error.message}`);
    throw error;
  }
}

module.exports = { handleAccountPosts };