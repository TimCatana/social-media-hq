const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { METRICS } = require('../../constants');

async function getInstagramAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  if (!METRICS.instagram.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Instagram; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    const igUserId = isMyAccount ? config.platforms.instagram.INSTAGRAM_BUSINESS_ACCOUNT_ID : account;
    const url = `https://graph.facebook.com/v20.0/${igUserId}/media`;
    const accessToken = config.tokens.instagram.token;
    const posts = await fetchPaginatedData(url, { fields: 'id,timestamp,caption,like_count,comments_count,media_type,media_url,permalink', limit: 100 }, accessToken, verbose);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.timestamp,
      message: post.caption || '',
      permalink_url: post.permalink,
      likes: post.like_count || 0,
      comments: post.comments_count || 0,
      shares: 0,
      media_type: post.media_type || '',
      media_url: post.media_url || '',
      views: 0,
      engagement: (post.like_count || 0) + (post.comments_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(post => [post.id, post.created_time, post.message, post.permalink_url, post.likes, post.comments, post.shares, post.media_type, post.media_url, post.views, post.engagement]);
    return await writeCsv(`instagram_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, ['ID', 'Created Time', 'Caption', 'Permalink', 'Likes', 'Comments', 'Shares', 'Media Type', 'Media URL', 'Views', 'Engagement'], rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Instagram posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getInstagramAccountPosts };