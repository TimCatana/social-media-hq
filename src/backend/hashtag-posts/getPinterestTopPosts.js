const axios = require('axios');
const { log } = require('../utils/logUtils');

async function getPinterestTopPosts(hashtag, token, metric, verbose = false) {
  const validMetrics = ['likes', 'comments', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Pinterest; defaulting to 'engagement'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'engagement';
  }

  try {
    const pins = [];
    let bookmark;
    const params = {
      query: hashtag.replace('#', ''),
      page_size: 100,
    };

    do {
      if (verbose) log('VERBOSE', `Fetching pins with bookmark: ${bookmark || 'none'}`);
      const response = await axios.get('https://api.pinterest.com/v5/search/pins', {
        headers: { Authorization: `Bearer ${token}` },
        params: bookmark ? { ...params, bookmark } : params,
      });
      pins.push(...(response.data.items || []));
      bookmark = response.data.bookmark;
    } while (bookmark && pins.length < 200); // Cap at 200

    const filteredPins = pins.filter(pin => pin.description && pin.description.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')));
    if (verbose) log('VERBOSE', `Filtered ${filteredPins.length} pins containing '${hashtag}' from ${pins.length} total`);

    const normalizedPins = filteredPins.map(pin => ({
      id: pin.id,
      created_time: pin.created_at,
      description: pin.description || '',
      url: pin.link || `https://www.pinterest.com/pin/${pin.id}`,
      likes: pin.save_count || 0,
      comments: pin.comment_count || 0,
      engagement: (pin.save_count || 0) + (pin.comment_count || 0),
    }));

    normalizedPins.sort((a, b) => b[metric] - a[metric]);
    return normalizedPins.slice(0, 10);
  } catch (error) {
    log('ERROR', `Pinterest top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getPinterestTopPosts };