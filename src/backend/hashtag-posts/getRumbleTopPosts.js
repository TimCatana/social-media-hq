const axios = require('axios');
const { log } = require('../logging/logUtils');

async function getRumbleTopPosts(hashtag, token, metric) {
  if (!['likes', 'comments', 'views', 'engagement'].includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Rumble; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    // Hypothetical Rumble API (no public API exists as of March 2025)
    const response = await axios.get('https://api.rumble.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        q: hashtag,
        limit: 100,
      },
    });
    let videos = response.data.videos || [];

    // Normalize and sort videos (hypothetical metrics)
    videos = videos.map(video => ({
      id: video.id,
      url: video.url || `https://rumble.com/v${video.id}`,
      likes: video.likes || 0,
      comments: video.comments || 0,
      views: video.views || 0,
      engagement: (video.likes || 0) + (video.comments || 0),
    }));

    videos.sort((a, b) => b[metric] - a[metric]);
    return videos.slice(0, 10);
  } catch (error) {
    log('ERROR', `Rumble top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getRumbleTopPosts };