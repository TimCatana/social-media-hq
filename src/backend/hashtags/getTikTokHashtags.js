const axios = require('axios');
const { log } = require('../logging/logUtils');

async function getTikTokHashtags(seedKeyword, token) {
  const seedHashtag = `#${seedKeyword.toLowerCase()}`;

  try {
    const response = await axios.post('https://open.tiktokapis.com/v2/video/query/', {
      filters: { hashtag_names: [seedHashtag.slice(1)] },
      max_count: 100,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const videos = response.data.data || [];

    const hashtagCounts = {};
    videos.forEach(video => {
      const description = video.desc || '';
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
    log('ERROR', `TikTok hashtag gathering failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getTikTokHashtags };