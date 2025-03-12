const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { log } = require('../utils/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getTikTokAccountPosts(account, isMyAccount, metric = 'likes', config, verbose = false) {
  const accessToken = config.tokens.tiktok?.token;
  const csvPath = path.join(CSV_DIR, `tiktok_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);

  const validMetrics = ['likes', 'comments', 'views', 'shares', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for TikTok; defaulting to 'likes'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'likes';
  }

  try {
    const posts = [];
    let cursor;
    const fields = 'id,create_time,title,description,video_url,stats{play_count,comment_count,digg_count,share_count}';

    if (isMyAccount) {
      do {
        if (verbose) log('VERBOSE', `Fetching TikTok videos with cursor: ${cursor || 'none'}`);
        const response = await axios.post('https://open.tiktokapis.com/v2/video/list/', {
          max_count: 100,
          cursor: cursor,
          fields,
        }, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        posts.push(...(response.data.data.videos || []));
        cursor = response.data.data.has_more ? response.data.data.cursor : null;
      } while (cursor);
    } else {
      log('WARN', 'TikTok public account posts require research API or scraping; limited to authenticated user');
      if (verbose) log('VERBOSE', 'Skipping public account fetch due to API restrictions');
      return csvPath; // Empty CSV for now
    }

    const postData = posts.map(video => ({
      id: video.id,
      created_time: new Date(video.create_time * 1000).toISOString(),
      title: video.title || '',
      description: video.description || '',
      media_url: video.video_url || '',
      likes: video.stats.digg_count || 0,
      comments: video.stats.comment_count || 0,
      views: video.stats.play_count || 0,
      shares: video.stats.share_count || 0,
      engagement: (video.stats.digg_count || 0) + (video.stats.comment_count || 0) + (video.stats.share_count || 0),
    }));

    if (verbose) log('VERBOSE', `Retrieved ${postData.length} videos for ${account}`);
    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Video ID,Created Time,Title,Description,Media URL,Likes,Comments,Views,Shares,Engagement\n';
    const csvRows = postData.map(post => 
      `"${post.id}","${post.created_time}","${post.title.replace(/"/g, '""')}","${post.description.replace(/"/g, '""')}","${post.media_url}",${post.likes},${post.comments},${post.views},${post.shares},${post.engagement}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `TikTok videos for ${account} sorted by ${metric} saved to ${csvPath}`);
    if (verbose) log('VERBOSE', `CSV written with ${postData.length} rows`);
    return csvPath;
  } catch (error) {
    log('ERROR', `TikTok posts retrieval failed for ${account}: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getTikTokAccountPosts };