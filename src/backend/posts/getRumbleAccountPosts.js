const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { getRumbleToken } = require('../auth/rumbleAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');
const { log } = require('../logging/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getRumbleAccountPosts(account, isMyAccount, metric = 'likes') {
  const config = await loadConfig();
  const accessToken = await getRumbleToken(config);
  const csvPath = path.join(CSV_DIR, 'rumble_competitor_analysis.csv');

  const validMetrics = ['likes', 'comments', 'views', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Rumble; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    const userId = isMyAccount ? process.env.RUMBLE_USER_ID : account.replace('@', '');
    if (!userId) throw new Error('RUMBLE_USER_ID not set in .env for my account');

    // Hypothetical API (no public API as of March 2025)
    const response = await axios.get(`https://api.rumble.com/v1/user/${userId}/videos`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit: 100 },
    });
    const videos = response.data.videos || [];

    const postData = videos.map(video => ({
      id: video.id,
      created_time: video.created_at,
      likes: video.likes || 0,
      comments: video.comments || 0,
      views: video.views || 0,
      engagement: (video.likes || 0) + (video.comments || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Video ID,Created Time,Likes,Comments,Views\n';
    const csvRows = postData.map(post => 
      `${post.id},${post.created_time},${post.likes},${post.comments},${post.views}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `Rumble videos sorted by ${metric} saved to ${csvPath}`);
    await saveConfig(config);
    return csvPath;
  } catch (error) {
    log('ERROR', `Rumble account posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getRumbleAccountPosts };