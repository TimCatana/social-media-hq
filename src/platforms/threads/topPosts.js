const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { METRICS } = require('../../constants');

async function getThreadsTopPosts(hashtag, metric, config, verbose = false) {
  if (!METRICS.threads.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Threads; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const userId = config.platforms.threads.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    const url = `https://graph.threads.net/v1.0/${userId}/threads`;
    const accessToken = config.tokens['instagram-threads'].token;
    const posts = await fetchPaginatedData(url, { fields: 'id,timestamp,text,like_count,reply_count,permalink', limit: 100 }, accessToken, verbose);

    const filteredPosts = posts
      .filter(post => post.text?.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')))
      .map(post => ({
        id: post.id,
        created_time: post.timestamp,
        message: post.text || '',
        url: post.permalink || '',
        likes: post.like_count || 0,
        comments: post.reply_count || 0,
        shares: 0,
        engagement: (post.like_count || 0) + (post.reply_count || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = filteredPosts.map(post => [post.id, post.created_time, post.message, post.url, post.likes, post.comments, post.shares, post.engagement]);
    return await writeCsv(`threads_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, ['ID', 'Created Time', 'Message', 'URL', 'Likes', 'Comments', 'Shares', 'Engagement'], rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Threads top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getThreadsTopPosts };