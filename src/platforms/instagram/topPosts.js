const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { METRICS } = require('../../constants');

async function getInstagramTopPosts(hashtag, metric, config, verbose = false) {
  if (!METRICS.instagram.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Instagram; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const igUserId = config.platforms.instagram.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    const url = `https://graph.facebook.com/v20.0/${igUserId}/media`;
    const accessToken = config.tokens.instagram.token;
    const posts = await fetchPaginatedData(url, { fields: 'id,timestamp,caption,like_count,comments_count,permalink', limit: 100 }, accessToken, verbose);

    const filteredPosts = posts
      .filter(post => post.caption?.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')))
      .map(post => ({
        id: post.id,
        created_time: post.timestamp,
        message: post.caption || '',
        url: post.permalink,
        likes: post.like_count || 0,
        comments: post.comments_count || 0,
        shares: 0,
        engagement: (post.like_count || 0) + (post.comments_count || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = filteredPosts.map(post => [post.id, post.created_time, post.message, post.url, post.likes, post.comments, post.shares, post.engagement]);
    return await writeCsv(`instagram_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, ['ID', 'Created Time', 'Caption', 'URL', 'Likes', 'Comments', 'Shares', 'Engagement'], rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Instagram top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getInstagramTopPosts };