const axios = require('axios');
const { log } = require('../logging/logUtils');

async function getTikTokTopPosts(hashtag, token, metric) {
  if (!['likes', 'comments', 'views', 'engagement'].includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for TikTok; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const response = await axios.post('https://open.tiktokapis.com/v2/video/query/', {
      filters: { hashtag_names: [hashtag.replace('#', '')] },
      max_count: 100,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let videos = response.data.data || [];

    // Normalize and sort videos
    videos = videos.map(video => ({
      id: video.id,
      url: `https://www.tiktok.com/@${video.username}/video/${video.id}`,
      likes: video.stats.digg_count || 0,
      comments: video.stats.comment_count || 0,
      views: video.stats.play_count || 0,
      engagement: (video.stats.digg_count || 0) + (video.stats.comment_count || 0),
    }));

    videos.sort((a, b) => b[metric] - a[metric]);
    return videos.slice(0, 10);
  } catch (error) {
    log('ERROR', `TikTok top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getTikTokTopPosts };