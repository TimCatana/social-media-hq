const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { METRICS } = require('../../constants');

async function getRumbleAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  if (!METRICS.rumble.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Rumble; defaulting to 'views'`);
    metric = 'views';
  }

  try {
    const url = 'https://api.rumble.com/v1/videos';
    const accessToken = config.tokens.rumble.token;
    const posts = await fetchPaginatedData(url, { query: `user=${account}`, fields: 'id,created_at,title,description,views,likes,dislikes', limit: 100 }, accessToken, verbose);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.created_at,
      message: `${post.title || ''} ${post.description || ''}`.trim(),
      permalink_url: `https://rumble.com/v${post.id}`,
      likes: post.likes || 0,
      comments: 0,
      shares: 0,
      media_type: 'video',
      media_url: '',
      views: post.views || 0,
      engagement: (post.likes || 0) + (post.views || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(post => [post.id, post.created_time, post.message, post.permalink_url, post.likes, post.comments, post.shares, post.media_type, post.media_url, post.views, post.engagement]);
    return await writeCsv(`rumble_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, ['ID', 'Created Time', 'Message', 'Permalink', 'Likes', 'Comments', 'Shares', 'Media Type', 'Media URL', 'Views', 'Engagement'], rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Rumble posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getRumbleAccountPosts };