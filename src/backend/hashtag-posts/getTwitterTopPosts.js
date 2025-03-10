const axios = require('axios');
const { log } = require('../logging/logUtils');

async function getTwitterTopPosts(hashtag, token, metric) {
  if (!['likes', 'comments', 'views', 'engagement'].includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Twitter; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        query: hashtag,
        max_results: 100,
        tweet: { fields: 'public_metrics' }, // Corrected syntax
      },
    });
    let tweets = response.data.data || [];

    // Normalize and sort tweets
    tweets = tweets.map(tweet => ({
      id: tweet.id,
      url: `https://twitter.com/i/status/${tweet.id}`,
      likes: tweet.public_metrics.like_count || 0,
      comments: tweet.public_metrics.reply_count || 0,
      views: tweet.public_metrics.impression_count || 0,
      engagement: (tweet.public_metrics.like_count || 0) + (tweet.public_metrics.reply_count || 0),
    }));

    tweets.sort((a, b) => b[metric] - a[metric]);
    return tweets.slice(0, 10);
  } catch (error) {
    log('ERROR', `Twitter top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getTwitterTopPosts };