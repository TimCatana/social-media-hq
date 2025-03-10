const axios = require('axios');
const { log } = require('../logging/logUtils');

async function getPinterestHashtags(seedKeyword, token) {
  const seedHashtag = `#${seedKeyword.toLowerCase()}`;

  try {
    const response = await axios.get('https://api.pinterest.com/v5/pins', {
      headers: { Authorization: `Bearer ${token}` },
      params: { query: seedHashtag, limit: 100 },
    });
    const pins = response.data.items || [];

    const hashtagCounts = {};
    pins.forEach(pin => {
      const description = pin.description || '';
      if (description.toLowerCase().includes(seedHashtag)) {
        const hashtags = description.match(/#\w+/g) || [];
        hashtags.forEach(tag => {
          const lowerTag = tag.toLowerCase();
          if (lowerTag !== seedHashtag) {
            hashtagCounts[lowerTag] = (hashtagCounts[lowerTag] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([hashtag, frequency]) => ({ hashtag, frequency }));
  } catch (error) {
    log('ERROR', `Pinterest hashtag gathering failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getPinterestHashtags };