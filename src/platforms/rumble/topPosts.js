const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getRumbleToken } = require('../../auth/rumble');
const { csvHeaderTopPosts, mapTopPostToCsvRow } = require('./config');
const { METRICS } = require('../../constants');

async function getRumbleTopPosts(hashtag, metric, config, verbose = false) {
  const accessToken = await getRumbleToken(config);
  if (!METRICS.rumble.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Rumble; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const url = 'https://api.rumble.com/v1/search'; // Hypothetical
    const posts = await fetchPaginatedData(url, { q: hashtag, limit: 100 }, accessToken, verbose, {
      headers: { Authorization: `Bearer ${accessToken}` },
      dataKey: 'videos',
    });

    const topPosts = posts
      .map(video => ({
        id: video.id,
        created_time: video.created_at || '',
        title: video.title || '',
        url: video.url || `https://rumble.com/v${video.id}`,
        likes: video.likes || 0,
        comments: video.comments || 0,
        views: video.views || 0,
        engagement: (video.likes || 0) + (video.comments || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = topPosts.map(mapTopPostToCsvRow);
    return await writeCsv(`rumble_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeaderTopPosts, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Rumble top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getRumbleTopPosts };