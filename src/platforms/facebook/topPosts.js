const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getFacebookToken } = require('../../auth/facebook');
const { csvHeaderTopPosts, mapTopPostToCsvRow } = require('./config');
const { METRICS } = require('../../constants');

async function getFacebookTopPosts(hashtag, metric, config, verbose = false) {
  const accessToken = await getFacebookToken(config);
  if (!METRICS.facebook.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Facebook; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const pageId = config.platforms.facebook.PAGE_ID || 'me';
    const url = `https://graph.facebook.com/v20.0/${pageId}/posts`;
    const posts = await fetchPaginatedData(url, {
      fields: 'id,created_time,message,permalink_url,reactions.summary(total_count),comments.summary(total_count),shares',
      limit: 100,
    }, accessToken, verbose);

    const filteredPosts = posts
      .filter(post => post.message?.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')))
      .map(post => ({
        id: post.id,
        created_time: post.created_time,
        message: post.message || '',
        url: post.permalink_url,
        likes: post.reactions?.summary.total_count || 0,
        comments: post.comments?.summary.total_count || 0,
        shares: post.shares?.count || 0,
        engagement: (post.reactions?.summary.total_count || 0) + (post.comments?.summary.total_count || 0) + (post.shares?.count || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = filteredPosts.map(mapTopPostToCsvRow);
    return await writeCsv(`facebook_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeaderTopPosts, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Facebook top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getFacebookTopPosts };