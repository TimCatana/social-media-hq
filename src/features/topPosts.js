const { promptForPlatform, promptForHashtag, promptForMetric } = require('../utils/promptUtils');
const { METRICS } = require('../constants');
const { log } = require('../utils/logUtils');
const { loadConfig } = require('../utils/configUtils');

const TOP_POSTS = {
  facebook: require('../platforms/facebook/topPosts').getFacebookTopPosts,
  instagram: require('../platforms/instagram/topPosts').getInstagramTopPosts,
  pinterest: require('../platforms/pinterest/topPosts').getPinterestTopPosts,
  rumble: require('../platforms/rumble/topPosts').getRumbleTopPosts,
  threads: require('../platforms/threads/topPosts').getThreadsTopPosts,
  tiktok: require('../platforms/tiktok/topPosts').getTikTokTopPosts,
  twitter: require('../platforms/twitter/topPosts').getTwitterTopPosts,
  youtube: require('../platforms/youtube/topPosts').getYouTubeTopPosts,
};

async function handleTopPosts() {
  const config = await loadConfig();
  const platform = await promptForPlatform('top posts by hashtag');
  if (platform === 'back') return;

  try {
    const hashtag = await promptForHashtag(platform);
    const metric = await promptForMetric(platform, METRICS[platform]);

    log('INFO', `Retrieving top ${platform} posts for ${hashtag} sorted by ${metric}`);
    const csvPath = await TOP_POSTS[platform](hashtag, metric, config);
    log('INFO', `Top posts saved to ${csvPath}`);
  } catch (error) {
    log('ERROR', `Failed to retrieve ${platform} top posts: ${error.message}`);
  }
}

module.exports = { handleTopPosts };