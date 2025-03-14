const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { METRICS } = require('../../constants');

async function getPinterestAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  if (!METRICS.pinterest.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Pinterest; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const url = 'https://api.pinterest.com/v5/pins';
    const accessToken = config.tokens.pinterest.token;
    const posts = await fetchPaginatedData(url, { query: `creator_id=${account}`, fields: 'id,created_at,title,description,link,pin_metrics', limit: 100 }, accessToken, verbose);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.created_at,
      message: `${post.title || ''} ${post.description || ''}`.trim(),
      permalink_url: post.link || '',
      likes: post.pin_metrics?.reaction_count || 0,
      comments: post.pin_metrics?.comment_count || 0,
      shares: post.pin_metrics?.save_count || 0,
      media_type: 'image',
      media_url: post.media?.images?.['1200x']?.url || '',
      views: post.pin_metrics?.impression_count || 0,
      engagement: (post.pin_metrics?.reaction_count || 0) + (post.pin_metrics?.comment_count || 0) + (post.pin_metrics?.save_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(post => [post.id, post.created_time, post.message, post.permalink_url, post.likes, post.comments, post.shares, post.media_type, post.media_url, post.views, post.engagement]);
    return await writeCsv(`pinterest_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, ['ID', 'Created Time', 'Message', 'Permalink', 'Likes', 'Comments', 'Shares', 'Media Type', 'Media URL', 'Views', 'Engagement'], rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Pinterest posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getPinterestAccountPosts };