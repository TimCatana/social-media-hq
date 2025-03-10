const axios = require('axios');
const { log } = require('../logging/logUtils');

async function getPinterestTopPosts(hashtag, token, metric) {
  if (!['likes', 'comments', 'engagement'].includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Pinterest; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const response = await axios.get('https://api.pinterest.com/v5/pins', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        query: hashtag.replace('#', ''),
        limit: 100,
      },
    });
    let pins = response.data.items || [];

    // Filter pins containing the hashtag/keyword
    pins = pins.filter(pin => pin.description && pin.description.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')));

    // Normalize and sort pins (Pinterest uses saves instead of likes)
    pins = pins.map(pin => ({
      id: pin.id,
      url: pin.link || `https://www.pinterest.com/pin/${pin.id}`,
      likes: pin.save_count || 0, // Approximation using saves
      comments: pin.comment_count || 0,
      views: 0, // Pinterest API doesn't provide views
      engagement: (pin.save_count || 0) + (pin.comment_count || 0),
    }));

    pins.sort((a, b) => b[metric] - a[metric]);
    return pins.slice(0, 10);
  } catch (error) {
    log('ERROR', `Pinterest top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getPinterestTopPosts };