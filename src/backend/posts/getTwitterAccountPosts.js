const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { log } = require('../utils/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getTwitterAccountPosts(account, isMyAccount, metric = 'likes', config, verbose = false) {
  const accessToken = config.tokens.x?.token;
  const csvPath = path.join(CSV_DIR, `twitter_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);

  const validMetrics = ['likes', 'comments', 'views', 'retweets', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Twitter; defaulting to 'likes'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'likes';
  }

  try {
    let userId = account.replace('@', '');
    if (!isMyAccount && account.startsWith('@')) {
      if (verbose) log('VERBOSE', `Resolving Twitter user ID for ${account}`);
      const userResponse = await axios.get(`https://api.twitter.com/2/users/by/username/${account.replace('@', '')}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      userId = userResponse.data.data.id;
      if (!userId) throw new Error(`Could not resolve Twitter user ID for ${account}`);
      if (verbose) log('VERBOSE', `Resolved user ID: ${userId}`);
    }

    const posts = [];
    let paginationToken;
    do {
      if (verbose) log('VERBOSE', `Fetching tweets for user ${userId} with pagination: ${paginationToken || 'none'}`);
      const response = await axios.get(`https://api.twitter.com/2/users/${userId}/tweets`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          max_results: 100,
          tweet_fields: 'public_metrics,created_at,text,attachments',
          pagination_token: paginationToken,
        },
      });
      posts.push(...(response.data.data || []));
      paginationToken = response.data.meta.next_token;
    } while (paginationToken);

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

    if (verbose) log('VERBOSE', `Retrieved ${postData.length} tweets for ${account}`);
    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Tweet ID,Created Time,Text,Likes,Comments,Views,Retweets,Media URL,Engagement\n';
    const csvRows = postData.map(post => 
      `"${post.id}","${post.created_time}","${post.text.replace(/"/g, '""')}",${post.likes},${post.comments},${post.views},${post.retweets},"${post.media_url}",${post.engagement}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `Twitter tweets for ${account} sorted by ${metric} saved to ${csvPath}`);
    if (verbose) log('VERBOSE', `CSV written with ${postData.length} rows`);
    return csvPath;
  } catch (error) {
    log('ERROR', `Twitter posts retrieval failed for ${account}: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getTwitterAccountPosts };