const axios = require('axios');

async function getInstagramHashtags(seedKeyword, token) {
  const hashtag = seedKeyword.toLowerCase();

  const hashtagIdResponse = await axios.get('https://graph.facebook.com/v20.0/ig_hashtag_search', {
    params: {
      user_id: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
      q: hashtag,
      access_token: token,
    },
  });
  const hashtagId = hashtagIdResponse.data.data[0].id;

  const mediaResponse = await axios.get(`https://graph.facebook.com/v20.0/${hashtagId}/recent_media`, {
    params: {
      user_id: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
      fields: 'caption',
      access_token: token,
    },
  });
  const media = mediaResponse.data.data || [];

  const hashtagCounts = {};
  media.forEach(item => {
    const caption = item.caption || '';
    const hashtags = caption.match(/#\w+/g) || [];
    hashtags.forEach(tag => {
      const lowerTag = tag.toLowerCase();
      if (lowerTag !== `#${hashtag}`) {
        hashtagCounts[lowerTag] = (hashtagCounts[lowerTag] || 0) + 1;
      }
    });
  });

  return Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([hashtag, frequency]) => ({ hashtag, frequency }));
}

module.exports = { getInstagramHashtags };