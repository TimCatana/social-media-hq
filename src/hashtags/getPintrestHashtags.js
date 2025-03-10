const axios = require('axios');

async function getPinterestHashtags(seedKeyword, token) {
  const hashtag = `#${seedKeyword.toLowerCase()}`;

  const response = await axios.get('https://api.pinterest.com/v5/pins', {
    headers: { Authorization: `Bearer ${token}` },
    params: { query: hashtag, limit: 100 },
  });
  const pins = response.data.items || [];

  const hashtagCounts = {};
  pins.forEach(pin => {
    const description = pin.description || '';
    const hashtags = description.match(/#\w+/g) || [];
    hashtags.forEach(tag => {
      const lowerTag = tag.toLowerCase();
      if (lowerTag !== hashtag) {
        hashtagCounts[lowerTag] = (hashtagCounts[lowerTag] || 0) + 1;
      }
    });
  });

  return Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([hashtag, frequency]) => ({ hashtag, frequency }));
}

module.exports = { getPinterestHashtags };