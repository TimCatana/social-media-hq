const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { METRICS } = require('../../constants');

async function getRumbleTopPosts(hashtag, metric, config, verbose = false) {
  if (!METRICS.rumble.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Rumble; defaulting to 'views'`);
    metric = 'views';
  }

  try {
    const url = 'https://api.rumble.com/v1/videos';
    const accessToken = config.tokens.rumble.token;
    const posts = await fetchPaginatedData(url, { query: `tag=${hashtag}`, fields: 'id,created_at,title,description,views,likes', limit: 100 }, accessToken, verbose);

    const filteredPosts = posts
      .filter(post => post.description?.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')))
      .map(post => ({
        id: post.id,
        created_time: post.created_at,
        message: `${post.title || ''} ${post.description || ''}`.trim(),
        url: `https://rumble.com/v${post.id}`,
        likes: post.likes || 0,
        comments: 0,
        shares: 0,
        engagement: (post.likes || 0) + (post.views || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = filteredPosts.map(post => [post.id, post.created_time, post.message, post.url, post.likes, post.comments, post.shares, post.engagement]);
    return await writeCsv(`rumble_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, ['ID', 'Created Time', 'Message', 'URL', 'Likes', 'Comments', 'Shares', 'Engagement'], rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Rumble top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getRumbleTopPosts };