const { promptForPlatform, promptForAccount, promptForIsMyAccount, promptForMetric } = require('../utils/promptUtils');
const { METRICS } = require('../constants');
const { log } = require('../utils/logUtils');
const { loadConfig } = require('../utils/configUtils');

const POSTS = {
  facebook: require('../platforms/facebook/accountPosts').getFacebookAccountPosts,
  instagram: require('../platforms/instagram/accountPosts').getInstagramAccountPosts,
  pinterest: require('../platforms/pinterest/accountPosts').getPinterestAccountPosts,
  rumble: require('../platforms/rumble/accountPosts').getRumbleAccountPosts,
  threads: require('../platforms/threads/accountPosts').getThreadsAccountPosts,
  tiktok: require('../platforms/tiktok/accountPosts').getTikTokAccountPosts,
  twitter: require('../platforms/twitter/accountPosts').getTwitterAccountPosts,
  youtube: require('../platforms/youtube/accountPosts').getYouTubeAccountPosts,
};

async function handleAccountPosts() {
  const config = await loadConfig();
  const platform = await promptForPlatform('account posts');
  if (platform === 'back') return;

  try {
    const account = await promptForAccount(platform);
    const isMyAccount = await promptForIsMyAccount();
    const metric = await promptForMetric(platform, METRICS[platform]);

    log('INFO', `Retrieving ${platform} posts for ${account} sorted by ${metric}`);
    const csvPath = await POSTS[platform](account, isMyAccount, metric, config);
    log('INFO', `Account posts saved to ${csvPath}`);
  } catch (error) {
    log('ERROR', `Failed to retrieve ${platform} account posts: ${error.message}`);
  }
}

module.exports = { handleAccountPosts };