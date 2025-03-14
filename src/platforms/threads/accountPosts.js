const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { METRICS } = require('../../constants');

async function getThreadsAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  if (!METRICS.threads.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Threads; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    const userId = isMyAccount ? config.platforms.threads.INSTAGRAM_BUSINESS_ACCOUNT_ID : account;
    const url = `https://graph.threads.net/v1.0/${userId}/threads`;
    const accessToken = config.tokens['instagram-threads'].token;
    const posts = await fetchPaginatedData(url, { fields: 'id,timestamp,text,like_count,reply_count,permalink', limit: 100 }, accessToken, verbose);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.timestamp,
      message: post.text || '',
      permalink_url: post.permalink || '',
      likes: post.like_count || 0,
      comments: post.reply_count || 0,
      shares: 0,
      media_type: '',
      media_url: '',
      views: 0,
      engagement: (post.like_count || 0) + (post.reply_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(post => [post.id, post.created_time, post.message, post.permalink_url, post.likes, post.comments, post.shares, post.media_type, post.media_url, post.views, post.engagement]);
    return await writeCsv(`threads_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, ['ID', 'Created Time', 'Message', 'Permalink', 'Likes', 'Comments', 'Shares', 'Media Type', 'Media URL', 'Views', 'Engagement'], rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Threads posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getThreadsAccountPosts };