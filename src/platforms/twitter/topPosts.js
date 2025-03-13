const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getTwitterToken } = require('../../auth/twitter');
const { csvHeaderTopPosts, mapTopPostToCsvRow } = require('./config');
const { METRICS } = require('../../constants');

async function getTwitterTopPosts(hashtag, metric, config, verbose = false) {
  const accessToken = await getTwitterToken(config);
  if (!METRICS.twitter.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Twitter; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const url = 'https://api.twitter.com/2/tweets/search/recent';
    const posts = await fetchPaginatedData(url, {
      query: hashtag,
      max_results: 100,
      tweet_fields: 'created_at,text,public_metrics',
    }, accessToken, verbose, {
      headers: { Authorization: `Bearer ${accessToken}` },
      nextKey: 'meta.next_token',
    });

    const topPosts = posts
      .map(tweet => ({
        id: tweet.id,
        created_time: tweet.created_at,
        text: tweet.text || '',
        url: `https://twitter.com/i/status/${tweet.id}`,
        likes: tweet.public_metrics.like_count || 0,
        comments: tweet.public_metrics.reply_count || 0,
        views: tweet.public_metrics.impression_count || 0,
        retweets: tweet.public_metrics.retweet_count || 0,
        engagement: (tweet.public_metrics.like_count || 0) + (tweet.public_metrics.reply_count || 0) + (tweet.public_metrics.retweet_count || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = topPosts.map(mapTopPostToCsvRow);
    return await writeCsv(`twitter_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeaderTopPosts, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Twitter top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getTwitterTopPosts };