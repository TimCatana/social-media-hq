const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { METRICS } = require('../../constants');

async function getTwitterAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  if (!METRICS.twitter.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Twitter; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    const url = `https://api.twitter.com/2/users/by/username/${account}/tweets`;
    const accessToken = config.tokens.x.token;
    const posts = await fetchPaginatedData(url, { tweet_fields: 'id,created_at,text,public_metrics', limit: 100 }, accessToken, verbose);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.created_at,
      message: post.text || '',
      permalink_url: `https://twitter.com/${account}/status/${post.id}`,
      likes: post.public_metrics?.like_count || 0,
      comments: post.public_metrics?.reply_count || 0,
      shares: post.public_metrics?.retweet_count || 0,
      media_type: '',
      media_url: '',
      views: post.public_metrics?.impression_count || 0,
      engagement: (post.public_metrics?.like_count || 0) + (post.public_metrics?.reply_count || 0) + (post.public_metrics?.retweet_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(post => [post.id, post.created_time, post.message, post.permalink_url, post.likes, post.comments, post.shares, post.media_type, post.media_url, post.views, post.engagement]);
    return await writeCsv(`twitter_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, ['ID', 'Created Time', 'Message', 'Permalink', 'Likes', 'Comments', 'Shares', 'Media Type', 'Media URL', 'Views', 'Engagement'], rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Twitter posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getTwitterAccountPosts };