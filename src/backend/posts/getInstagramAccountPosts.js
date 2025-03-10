const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { getInstagramThreadsToken } = require('../auth/instagramThreadsAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');
const { log } = require('../logging/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getInstagramAccountPosts(account, isMyAccount, metric = 'likes') {
  const config = await loadConfig();
  const accessToken = await getInstagramThreadsToken(config);
  const csvPath = path.join(CSV_DIR, 'instagram_competitor_analysis.csv');

  const validMetrics = ['likes', 'comments', 'engagement']; // Views not directly available
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Instagram; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    let igUserId = isMyAccount ? process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID : account.replace('@', '');
    if (!igUserId) throw new Error('INSTAGRAM_BUSINESS_ACCOUNT_ID not set in .env for my account');

    // If not my account and input is a username, resolve to ID (requires app review for public access)
    if (!isMyAccount && account.startsWith('@')) {
      log('WARN', 'Public Instagram account lookup by username requires additional permissions; using input as ID');
    }

    const posts = [];
    let url = `https://graph.facebook.com/v20.0/${igUserId}/media`;
    const params = {
      access_token: accessToken,
      fields: 'id,timestamp,like_count,comments_count',
      limit: 100,
    };

    do {
      const response = await axios.get(url, { params });
      posts.push(...(response.data.data || []));
      url = response.data.paging?.next;
    } while (url);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.timestamp,
      likes: post.like_count || 0,
      comments: post.comments_count || 0,
      views: 0,
      engagement: (post.like_count || 0) + (post.comments_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Post ID,Created Time,Likes,Comments,Views\n';
    const csvRows = postData.map(post => 
      `${post.id},${post.created_time},${post.likes},${post.comments},${post.views}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `Instagram posts sorted by ${metric} saved to ${csvPath}`);
    await saveConfig(config);
    return csvPath;
  } catch (error) {
    log('ERROR', `Instagram account posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getInstagramAccountPosts };