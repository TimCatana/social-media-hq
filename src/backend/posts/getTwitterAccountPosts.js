const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { getTwitterToken } = require('../auth/twitterAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');
const { log } = require('../logging/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getTwitterAccountPosts(account, isMyAccount, metric = 'likes') {
  const config = await loadConfig();
  const accessToken = await getTwitterToken(config);
  const csvPath = path.join(CSV_DIR, 'twitter_competitor_analysis.csv');

  const validMetrics = ['likes', 'comments', 'views', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Twitter; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    let userId = isMyAccount ? process.env.TWITTER_USER_ID : account.replace('@', '');
    if (!userId) throw new Error('TWITTER_USER_ID not set in .env for my account');

    // Resolve username to ID if needed
    if (!isMyAccount && account.startsWith('@')) {
      const userResponse = await axios.get('https://api.twitter.com/2/users/by/username/' + account.replace('@', ''), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      userId = userResponse.data.data.id;
    }

    const posts = [];
    let paginationToken;
    do {
      const response = await axios.get(`https://api.twitter.com/2/users/${userId}/tweets`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          max_results: 100,
          tweet: { fields: 'public_metrics,created_at' },
          pagination_token: paginationToken,
        },
      });
      posts.push(...(response.data.data || []));
      paginationToken = response.data.meta.next_token;
    } while (paginationToken);

    const postData = posts.map(tweet => ({
      id: tweet.id,
      created_time: tweet.created_at,
      likes: tweet.public_metrics.like_count || 0,
      comments: tweet.public_metrics.reply_count || 0,
      views: tweet.public_metrics.impression_count || 0,
      engagement: (tweet.public_metrics.like_count || 0) + (tweet.public_metrics.reply_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Tweet ID,Created Time,Likes,Comments,Views\n';
    const csvRows = postData.map(post => 
      `${post.id},${post.created_time},${post.likes},${post.comments},${post.views}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `Twitter tweets sorted by ${metric} saved to ${csvPath}`);
    await saveConfig(config);
    return csvPath;
  } catch (error) {
    log('ERROR', `Twitter account posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getTwitterAccountPosts };