const axios = require('axios');
const { log } = require('../utils/logUtils');

async function getTikTokTopPosts(hashtag, token, metric, verbose = false) {
  const validMetrics = ['likes', 'comments', 'views', 'shares', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for TikTok; defaulting to 'engagement'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'engagement';
  }

  try {
    const videos = [];
    let cursor;
    const fields = 'id,create_time,description,video_url,stats{play_count,comment_count,digg_count,share_count}';

    do {
      if (verbose) log('VERBOSE', `Fetching videos with cursor: ${cursor || 'none'}`);
      const response = await axios.post('https://open.tiktokapis.com/v2/video/query/', {
        filters: { hashtag_names: [hashtag.replace('#', '')] },
        max_count: 100,
        cursor,
        fields,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      videos.push(...(response.data.data.videos || []));
      cursor = response.data.data.has_more ? response.data.data.cursor : null;
    } while (cursor && videos.length < 200);

    const normalizedVideos = videos.map(video => ({
      id: video.id,
      created_time: new Date(video.create_time * 1000).toISOString(),
      description: video.description || '',
      url: video.video_url || `https://www.tiktok.com/video/${video.id}`,
      likes: video.stats.digg_count || 0,
      comments: video.stats.comment_count || 0,
      views: video.stats.play_count || 0,
      shares: video.stats.share_count || 0,
      engagement: (video.stats.digg_count || 0) + (video.stats.comment_count || 0) + (video.stats.share_count || 0),
    }));

    if (verbose) log('VERBOSE', `Retrieved ${normalizedVideos.length} videos for hashtag '${hashtag}'`);
    normalizedVideos.sort((a, b) => b[metric] - a[metric]);
    return normalizedVideos.slice(0, 10);
  } catch (error) {
    log('ERROR', `TikTok top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getTikTokTopPosts };