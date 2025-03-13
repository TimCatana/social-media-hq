const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getInstagramToken } = require('../../auth/instagram');
const { csvHeader, mapPostToCsvRow, apiFields } = require('./config');
const { METRICS } = require('../../constants');

async function getInstagramAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  const accessToken = await getInstagramToken(config);
  if (!METRICS.instagram.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Instagram; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    const igUserId = isMyAccount ? config.platforms.instagram.INSTAGRAM_BUSINESS_ACCOUNT_ID : account.replace('@', '');
    const url = `https://graph.facebook.com/v20.0/${igUserId}/media`;
    const posts = await fetchPaginatedData(url, { fields: apiFields, limit: 100 }, accessToken, verbose);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.timestamp,
      caption: post.caption || '',
      permalink: post.permalink || '',
      likes: post.like_count || 0,
      comments: post.comments_count || 0,
      media_type: post.media_type || '',
      media_url: post.media_url || post.thumbnail_url || '',
      views: 0,
      engagement: (post.like_count || 0) + (post.comments_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(mapPostToCsvRow);
    return await writeCsv(`instagram_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeader, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Instagram posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getInstagramAccountPosts };