const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getFacebookToken } = require('../../auth/facebook');
const { csvHeader, mapPostToCsvRow, apiFields } = require('./config');
const { METRICS } = require('../../constants');

async function getFacebookAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  const accessToken = await getFacebookToken(config);
  if (!METRICS.facebook.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Facebook; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    const pageId = isMyAccount ? config.platforms.facebook.PAGE_ID : account.replace('@', '');
    const url = `https://graph.facebook.com/v20.0/${pageId}/posts`;
    const posts = await fetchPaginatedData(url, { fields: apiFields, limit: 100 }, accessToken, verbose);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.created_time,
      message: post.message || '',
      permalink_url: post.permalink_url,
      likes: post.reactions?.summary.total_count || 0,
      comments: post.comments?.summary.total_count || 0,
      shares: post.shares?.count || 0,
      media_type: post.attachments?.data[0]?.media_type || '',
      media_url: post.attachments?.data[0]?.url || '',
      views: 0,
      engagement: (post.reactions?.summary.total_count || 0) + (post.comments?.summary.total_count || 0) + (post.shares?.count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(mapPostToCsvRow);
    return await writeCsv(`facebook_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeader, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Facebook posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getFacebookAccountPosts };