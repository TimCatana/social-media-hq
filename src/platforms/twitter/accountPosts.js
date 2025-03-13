const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getTwitterToken } = require('../../auth/twitter');
const { csvHeader, mapPostToCsvRow, apiFields } = require('./config');
const { METRICS } = require('../../constants');
const axios = require('axios');

async function getTwitterAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  const accessToken = await getTwitterToken(config);
  if (!METRICS.twitter.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Twitter; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    let userId = isMyAccount ? 'me' : account.replace('@', '');
    if (!isMyAccount) {
      const userResponse = await axios.get(`https://api.twitter.com/2/users/by/username/${userId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      userId = userResponse.data.data.id;
    }

    const url = `https://api.twitter.com/2/users/${userId}/tweets`;
    const posts = await fetchPaginatedData(url, { tweet_fields: apiFields, max_results: 100 }, accessToken, verbose, {
      headers: { Authorization: `Bearer ${accessToken}` },
      nextKey: 'meta.next_token',
    });

    const postData = posts.map(tweet => ({
      id: tweet.id,
      created_time: tweet.created_at,
      text: tweet.text || '',
      likes: tweet.public_metrics.like_count || 0,
      comments: tweet.public_metrics.reply_count || 0,
      views: tweet.public_metrics.impression_count || 0,
      retweets: tweet.public_metrics.retweet_count || 0,
      media_url: tweet.attachments?.media_keys?.length ? 'media present' : '',
      engagement: (tweet.public_metrics.like_count || 0) + (tweet.public_metrics.reply_count || 0) + (tweet.public_metrics.retweet_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(mapPostToCsvRow);
    return await writeCsv(`twitter_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeader, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Twitter posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getTwitterAccountPosts };