const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { log } = require('../utils/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getPinterestAccountPosts(account, isMyAccount, metric = 'likes', config, verbose = false) {
  const accessToken = config.tokens.pinterest?.token;
  const csvPath = path.join(CSV_DIR, `pinterest_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);

  const validMetrics = ['likes', 'comments', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Pinterest; defaulting to 'likes'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'likes';
  }

  try {
    const username = account.replace('@', '');
    let url = isMyAccount ? 'https://api.pinterest.com/v5/pins' : `https://api.pinterest.com/v5/users/${username}/pins`;
    const pins = [];
    let bookmark;

    const params = {
      limit: 100,
    };

    do {
      if (verbose) log('VERBOSE', `Fetching pins from ${url} with bookmark: ${bookmark || 'none'}`);
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
      title: pin.title || '',
      description: pin.description || '',
      url: pin.link || '',
      media_type: pin.media?.media_type || '',
      media_url: pin.media?.images?.['1200x']?.url || pin.media?.video_url || '',
      likes: pin.save_count || 0,
      comments: pin.comment_count || 0,
      views: 0, // Not available
      engagement: (pin.save_count || 0) + (pin.comment_count || 0),
    }));

    if (verbose) log('VERBOSE', `Retrieved ${postData.length} pins for ${account}`);
    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Pin ID,Created Time,Title,Description,URL,Media Type,Media URL,Likes,Comments,Views,Engagement\n';
    const csvRows = postData.map(post => 
      `"${post.id}","${post.created_time}","${post.title.replace(/"/g, '""')}","${post.description.replace(/"/g, '""')}","${post.url}","${post.media_type}","${post.media_url}",${post.likes},${post.comments},${post.views},${post.engagement}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `Pinterest pins for ${account} sorted by ${metric} saved to ${csvPath}`);
    if (verbose) log('VERBOSE', `CSV written with ${postData.length} rows`);
    return csvPath;
  } catch (error) {
    log('ERROR', `Pinterest posts retrieval failed for ${account}: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getPinterestAccountPosts };