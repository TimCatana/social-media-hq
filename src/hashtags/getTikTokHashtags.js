const axios = require('axios');

async function getTikTokHashtags(seedKeyword, token) {
  const hashtag = `#${seedKeyword.toLowerCase()}`;

  const response = await axios.get('https://open.tiktokapis.com/v2/video/query/', {
    headers: { Authorization: `Bearer ${token}` },
    params: { query: hashtag, max_count: 100 },
  });
  const videos = response.data.data || [];

  const hashtagCounts = {};
  videos.forEach(video => {
    const description = video.desc || '';
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

module.exports = { getTikTokHashtags };