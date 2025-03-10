const axios = require('axios');
const { log } = require('../logging/logUtils');

async function getTwitterHashtags(seedKeyword, token) {
  const seedHashtag = `#${seedKeyword.toLowerCase()}`;

  try {
    const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
      headers: { Authorization: `Bearer ${token}` },
      params: { query: seedHashtag, max_results: 100 },
    });
    const tweets = response.data.data || [];

    const hashtagCounts = {};
    tweets.forEach(tweet => {
      const hashtags = tweet.text.match(/#\w+/g) || [];
      hashtags.forEach(tag => {
        const lowerTag = tag.toLowerCase();
        if (lowerTag !== seedHashtag) {
          hashtagCounts[lowerTag] = (hashtagCounts[lowerTag] || 0) + 1;
        }
      });
    });

    return Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([hashtag, frequency]) => ({ hashtag, frequency }));
  } catch (error) {
    log('ERROR', `Twitter hashtag gathering failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getTwitterHashtags };