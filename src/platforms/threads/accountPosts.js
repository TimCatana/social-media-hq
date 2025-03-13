const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getThreadsToken } = require('../../auth/instagram');
const { csvHeader, mapPostToCsvRow, apiFields } = require('./config');
const { METRICS } = require('../../constants');

async function getThreadsAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  const accessToken = await getThreadsToken(config);
  if (!METRICS.threads.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Threads; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    const userId = isMyAccount ? config.platforms.threads.INSTAGRAM_BUSINESS_ACCOUNT_ID : account.replace('@', '');
    const url = `https://graph.threads.net/v1.0/${userId}/threads`;
    const posts = await fetchPaginatedData(url, { fields: apiFields, limit: 100 }, accessToken, verbose);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.created_time,
      text: post.text || '',
      permalink: post.permalink || '',
      likes: post.like_count || 0,
      comments: post.comments_count || 0,
      media_type: post.media_type || '',
      media_url: post.media_url || '',
      views: 0,
      engagement: (post.like_count || 0) + (post.comments_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(mapPostToCsvRow);
    return await writeCsv(`threads_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeader, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Threads posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getThreadsAccountPosts };