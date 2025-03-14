const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { METRICS } = require('../../constants');

async function getTwitterTopPosts(hashtag, metric, config, verbose = false) {
  if (!METRICS.twitter.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Twitter; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const url = 'https://api.twitter.com/2/tweets/search/recent';
    const accessToken = config.tokens.x.token;
    const posts = await fetchPaginatedData(url, { query: hashtag, tweet_fields: 'id,created_at,text,public_metrics', limit: 100 }, accessToken, verbose);

    const filteredPosts = posts
      .filter(post => post.text?.toLowerCase().includes(hashtag.toLowerCase()))
      .map(post => ({
        id: post.id,
        created_time: post.created_at,
        message: post.text || '',
        url: `https://twitter.com/i/status/${post.id}`,
        likes: post.public_metrics?.like_count || 0,
        comments: post.public_metrics?.reply_count || 0,
        shares: post.public_metrics?.retweet_count || 0,
        engagement: (post.public_metrics?.like_count || 0) + (post.public_metrics?.reply_count || 0) + (post.public_metrics?.retweet_count || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = filteredPosts.map(post => [post.id, post.created_time, post.message, post.url, post.likes, post.comments, post.shares, post.engagement]);
    return await writeCsv(`twitter_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, ['ID', 'Created Time', 'Message', 'URL', 'Likes', 'Comments', 'Shares', 'Engagement'], rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Twitter top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getTwitterTopPosts };