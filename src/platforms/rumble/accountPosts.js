const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getRumbleToken } = require('../../auth/rumble');
const { csvHeader, mapPostToCsvRow, apiFields } = require('./config');
const { METRICS } = require('../../constants');

async function getRumbleAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  const accessToken = await getRumbleToken(config);
  if (!METRICS.rumble.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Rumble; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    const userId = account.replace('@', '');
    const url = `https://api.rumble.com/v1/user/${userId}/videos`; // Hypothetical
    const posts = await fetchPaginatedData(url, { fields: apiFields, limit: 100 }, accessToken, verbose, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const postData = posts.map(video => ({
      id: video.id,
      created_time: video.created_at,
      title: video.title || '',
      description: video.description || '',
      media_url: video.video_url || '',
      likes: video.likes || 0,
      comments: video.comments || 0,
      views: video.views || 0,
      engagement: (video.likes || 0) + (video.comments || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(mapPostToCsvRow);
    return await writeCsv(`rumble_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeader, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Rumble posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getRumbleAccountPosts };