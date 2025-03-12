const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { log } = require('../utils/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getRumbleAccountPosts(account, isMyAccount, metric = 'likes', config, verbose = false) {
  const accessToken = config.tokens.rumble?.token;
  const csvPath = path.join(CSV_DIR, `rumble_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);

  const validMetrics = ['likes', 'comments', 'views', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Rumble; defaulting to 'likes'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'likes';
  }

  try {
    const userId = account.replace('@', '');
    // Hypothetical API (no public API as of March 2025)
    if (verbose) log('VERBOSE', `Fetching Rumble videos for ${userId} (hypothetical API)`);
    const response = await axios.get(`https://api.rumble.com/v1/user/${userId}/videos`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit: 100 },
    });
    const videos = response.data.videos || [];

    const postData = videos.map(video => ({
      id: video.id,
      created_time: video.created_at,
      title: video.title || '',
      description: video.description || '',
      media_url: video.video_url || '',
      likes: video.likes || 0,
      comments: video.comments || 0,
      views: video.views || 0,
      engagement: (video.likes || 0) + (video.comments || 0),
    }));

    if (verbose) log('VERBOSE', `Retrieved ${postData.length} videos for ${account}`);
    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Video ID,Created Time,Title,Description,Media URL,Likes,Comments,Views,Engagement\n';
    const csvRows = postData.map(post => 
      `"${post.id}","${post.created_time}","${post.title.replace(/"/g, '""')}","${post.description.replace(/"/g, '""')}","${post.media_url}",${post.likes},${post.comments},${post.views},${post.engagement}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `Rumble videos for ${account} sorted by ${metric} saved to ${csvPath}`);
    if (verbose) log('VERBOSE', `CSV written with ${postData.length} rows`);
    return csvPath;
  } catch (error) {
    log('ERROR', `Rumble posts retrieval failed for ${account}: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getRumbleAccountPosts };