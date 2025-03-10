const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { getPinterestToken } = require('../auth/pinterestAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');
const { log } = require('../logging/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getPinterestAccountPosts(account, isMyAccount, metric = 'likes') {
  const config = await loadConfig();
  const accessToken = await getPinterestToken(config);
  const csvPath = path.join(CSV_DIR, 'pinterest_competitor_analysis.csv');

  const validMetrics = ['likes', 'comments', 'engagement']; // Views not available
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Pinterest; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    const username = isMyAccount ? process.env.PINTEREST_USERNAME : account.replace('@', '');
    if (!username) throw new Error('PINTEREST_USERNAME not set in .env for my account');

    const pins = [];
    let bookmark;
    const params = {
      limit: 100,
    };
    let url = isMyAccount 
      ? 'https://api.pinterest.com/v5/pins' 
      : `https://api.pinterest.com/v5/users/${username}/pins`;

    do {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: bookmark ? { ...params, bookmark } : params,
      });
      pins.push(...(response.data.items || []));
      bookmark = response.data.bookmark;
    } while (bookmark);

    const postData = pins.map(pin => ({
      id: pin.id,
      created_time: pin.created_at,
      likes: pin.save_count || 0, // Saves as likes
      comments: pin.comment_count || 0,
      views: 0,
      engagement: (pin.save_count || 0) + (pin.comment_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Pin ID,Created Time,Likes,Comments,Views\n';
    const csvRows = postData.map(post => 
      `${post.id},${post.created_time},${post.likes},${post.comments},${post.views}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `Pinterest pins sorted by ${metric} saved to ${csvPath}`);
    await saveConfig(config);
    return csvPath;
  } catch (error) {
    log('ERROR', `Pinterest account posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getPinterestAccountPosts };