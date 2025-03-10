const axios = require('axios');

async function getTwitterHashtags(seedKeyword, token) {
  const hashtag = `#${seedKeyword.toLowerCase()}`;

  const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
    headers: { Authorization: `Bearer ${token}` },
    params: { query: hashtag, max_results: 100 },
  });
  const tweets = response.data.data || [];

  const hashtagCounts = {};
  tweets.forEach(tweet => {
    const hashtags = tweet.text.match(/#\w+/g) || [];
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

module.exports = { getTwitterHashtags };