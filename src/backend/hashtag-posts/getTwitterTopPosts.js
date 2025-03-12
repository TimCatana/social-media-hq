const axios = require('axios');
const { log } = require('../utils/logUtils');

async function getTwitterTopPosts(hashtag, token, metric, verbose = false) {
  const validMetrics = ['likes', 'comments', 'views', 'retweets', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Twitter; defaulting to 'engagement'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'engagement';
  }

  try {
    const tweets = [];
    let nextToken;
    do {
      if (verbose) log('VERBOSE', `Fetching tweets with next_token: ${nextToken || 'none'}`);
      const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          query: hashtag,
          max_results: 100,
          tweet_fields: 'created_at,text,public_metrics',
          next_token: nextToken,
        },
      });
      tweets.push(...(response.data.data || []));
      nextToken = response.data.meta.next_token;
    } while (nextToken && tweets.length < 200);

    const normalizedTweets = tweets.map(tweet => ({
      id: tweet.id,
      created_time: tweet.created_at,
      text: tweet.text || '',
      url: `https://twitter.com/i/status/${tweet.id}`,
      likes: tweet.public_metrics.like_count || 0,
      comments: tweet.public_metrics.reply_count || 0,
      views: tweet.public_metrics.impression_count || 0,
      retweets: tweet.public_metrics.retweet_count || 0,
      engagement: (tweet.public_metrics.like_count || 0) + (tweet.public_metrics.reply_count || 0) + (tweet.public_metrics.retweet_count || 0),
    }));

    if (verbose) log('VERBOSE', `Retrieved ${normalizedTweets.length} tweets for hashtag '${hashtag}'`);
    normalizedTweets.sort((a, b) => b[metric] - a[metric]);
    return normalizedTweets.slice(0, 10);
  } catch (error) {
    log('ERROR', `Twitter top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getTwitterTopPosts };