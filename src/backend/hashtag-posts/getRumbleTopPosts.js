const axios = require('axios');
const { log } = require('../utils/logUtils');

async function getRumbleTopPosts(hashtag, token, metric, verbose = false) {
  const validMetrics = ['likes', 'comments', 'views', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Rumble; defaulting to 'engagement'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'engagement';
  }

  try {
    // Hypothetical API (no public API as of March 2025)
    const response = await axios.get('https://api.rumble.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        q: hashtag,
        limit: 100,
      },
    });
    const videos = response.data.videos || [];
    if (verbose) log('VERBOSE', `Fetched ${videos.length} videos from Rumble API`);

    const normalizedVideos = videos.map(video => ({
      id: video.id,
      created_time: video.created_at || '',
      title: video.title || '',
      url: video.url || `https://rumble.com/v${video.id}`,
      likes: video.likes || 0,
      comments: video.comments || 0,
      views: video.views || 0,
      engagement: (video.likes || 0) + (video.comments || 0),
    }));

    if (verbose) log('VERBOSE', `Retrieved ${normalizedVideos.length} videos for hashtag '${hashtag}'`);
    normalizedVideos.sort((a, b) => b[metric] - a[metric]);
    return normalizedVideos.slice(0, 10);
  } catch (error) {
    log('ERROR', `Rumble top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getRumbleTopPosts };