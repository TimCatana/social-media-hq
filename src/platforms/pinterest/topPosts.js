const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { METRICS } = require('../../constants');

async function getPinterestTopPosts(hashtag, metric, config, verbose = false) {
  if (!METRICS.pinterest.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Pinterest; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const url = 'https://api.pinterest.com/v5/pins';
    const accessToken = config.tokens.pinterest.token;
    const posts = await fetchPaginatedData(url, { query: `tag=${hashtag}`, fields: 'id,created_at,title,description,link,pin_metrics', limit: 100 }, accessToken, verbose);

    const filteredPosts = posts
      .filter(post => post.description?.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')))
      .map(post => ({
        id: post.id,
        created_time: post.created_at,
        message: `${post.title || ''} ${post.description || ''}`.trim(),
        url: post.link || '',
        likes: post.pin_metrics?.reaction_count || 0,
        comments: post.pin_metrics?.comment_count || 0,
        shares: post.pin_metrics?.save_count || 0,
        engagement: (post.pin_metrics?.reaction_count || 0) + (post.pin_metrics?.comment_count || 0) + (post.pin_metrics?.save_count || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = filteredPosts.map(post => [post.id, post.created_time, post.message, post.url, post.likes, post.comments, post.shares, post.engagement]);
    return await writeCsv(`pinterest_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, ['ID', 'Created Time', 'Message', 'URL', 'Likes', 'Comments', 'Shares', 'Engagement'], rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Pinterest top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getPinterestTopPosts };