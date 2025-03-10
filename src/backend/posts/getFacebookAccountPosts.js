const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { getFacebookToken } = require('../auth/facebookAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');
const { log } = require('../logging/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getFacebookAccountPosts(account, isMyAccount, metric = 'likes') {
  const config = await loadConfig();
  const accessToken = await getFacebookToken(config);
  const csvPath = path.join(CSV_DIR, 'facebook_competitor_analysis.csv');

  const validMetrics = ['likes', 'comments', 'engagement']; // Views not available
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Facebook; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    let pageId = isMyAccount ? process.env.FACEBOOK_PAGE_ID : account.replace('@', '');
    if (!pageId) throw new Error('FACEBOOK_PAGE_ID not set in .env for my account');

    // If not my account and input is a username, resolve to page ID
    if (!isMyAccount && account.startsWith('@')) {
      const searchResponse = await axios.get('https://graph.facebook.com/v20.0/pages/search', {
        params: {
          q: account.replace('@', ''),
          access_token: accessToken,
          fields: 'id',
        },
      });
      pageId = searchResponse.data.data[0]?.id;
      if (!pageId) throw new Error(`Could not resolve Facebook page ID for ${account}`);
    }

    const posts = [];
    let url = `https://graph.facebook.com/v20.0/${pageId}/posts`;
    const params = {
      access_token: accessToken,
      fields: 'id,created_time,reactions.summary(total_count),comments.summary(total_count)',
      limit: 100,
    };

    do {
      const response = await axios.get(url, { params });
      posts.push(...(response.data.data || []));
      url = response.data.paging?.next;
    } while (url);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.created_time,
      likes: post.reactions?.summary.total_count || 0,
      comments: post.comments?.summary.total_count || 0,
      views: 0,
      engagement: (post.reactions?.summary.total_count || 0) + (post.comments?.summary.total_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Post ID,Created Time,Likes,Comments,Views\n';
    const csvRows = postData.map(post => 
      `${post.id},${post.created_time},${post.likes},${post.comments},${post.views}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `Facebook posts sorted by ${metric} saved to ${csvPath}`);
    await saveConfig(config);
    return csvPath;
  } catch (error) {
    log('ERROR', `Facebook account posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getFacebookAccountPosts };