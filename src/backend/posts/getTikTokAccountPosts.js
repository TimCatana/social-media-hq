const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { getTikTokToken } = require('../auth/tiktokAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');
const { log } = require('../logging/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getTikTokAccountPosts(account, isMyAccount, metric = 'likes') {
  const config = await loadConfig();
  const accessToken = await getTikTokToken(config);
  const csvPath = path.join(CSV_DIR, 'tiktok_competitor_analysis.csv');

  const validMetrics = ['likes', 'comments', 'views', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for TikTok; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    let userId = isMyAccount ? process.env.TIKTOK_USER_ID : account.replace('@', '');
    if (!userId) throw new Error('TIKTOK_USER_ID not set in .env for my account');

    // Resolve username to ID if needed (requires /user/info/ endpoint)
    if (!isMyAccount && account.startsWith('@')) {
      const userResponse = await axios.post('https://open.tiktokapis.com/v2/user/info/', {
        fields: ['open_id'],
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      userId = userResponse.data.data.user.open_id; // Note: Needs scope for public data
      log('WARN', 'Public TikTok account lookup may require additional permissions');
    }

    const posts = [];
    let cursor;
    do {
      const response = await axios.post('https://open.tiktokapis.com/v2/video/list/', {
        max_count: 100,
        cursor: cursor,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      posts.push(...(response.data.data.videos || []));
      cursor = response.data.data.has_more ? response.data.data.cursor : null;
    } while (cursor);

    const postData = posts.map(video => ({
      id: video.id,
      created_time: new Date(video.create_time * 1000).toISOString(),
      likes: video.stats.digg_count || 0,
      comments: video.stats.comment_count || 0,
      views: video.stats.play_count || 0,
      engagement: (video.stats.digg_count || 0) + (video.stats.comment_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Video ID,Created Time,Likes,Comments,Views\n';
    const csvRows = postData.map(post => 
      `${post.id},${post.created_time},${post.likes},${post.comments},${post.views}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `TikTok videos sorted by ${metric} saved to ${csvPath}`);
    await saveConfig(config);
    return csvPath;
  } catch (error) {
    log('ERROR', `TikTok account posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getTikTokAccountPosts };