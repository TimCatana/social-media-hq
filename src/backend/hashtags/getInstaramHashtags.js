const axios = require('axios');
const { log } = require('../logging/logUtils');

async function getInstagramHashtags(seedKeyword, token) {
  const seedHashtag = seedKeyword.toLowerCase();

  try {
    const hashtagIdResponse = await axios.get('https://graph.facebook.com/v20.0/ig_hashtag_search', {
      params: {
        user_id: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
        q: seedHashtag,
        access_token: token,
      },
    });
    const hashtagId = hashtagIdResponse.data.data[0]?.id;
    if (!hashtagId) throw new Error(`Hashtag '${seedHashtag}' not found`);

    const mediaResponse = await axios.get(`https://graph.facebook.com/v20.0/${hashtagId}/recent_media`, {
      params: {
        user_id: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
        fields: 'caption',
        access_token: token,
        limit: 50,
      },
    });
    const media = mediaResponse.data.data || [];

    const hashtagCounts = {};
    media.forEach(item => {
      const caption = item.caption || '';
      if (caption.toLowerCase().includes(`#${seedHashtag}`)) {
        const hashtags = caption.match(/#\w+/g) || [];
        hashtags.forEach(tag => {
          const lowerTag = tag.toLowerCase();
          if (lowerTag !== `#${seedHashtag}`) {
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
    log('ERROR', `Instagram hashtag gathering failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getInstagramHashtags };