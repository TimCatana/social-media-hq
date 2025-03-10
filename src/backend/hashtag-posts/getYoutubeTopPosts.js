const axios = require('axios');
const { log } = require('../logging/logUtils');

async function getYouTubeTopPosts(hashtag, token, metric) {
  if (!['likes', 'comments', 'views', 'engagement'].includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for YouTube; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        part: 'snippet',
        q: hashtag,
        type: 'video',
        maxResults: 50,
      },
    });
    let videos = response.data.items || [];

    // Fetch video statistics
    const videoIds = videos.map(video => video.id.videoId).join(',');
    const statsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        part: 'statistics',
        id: videoIds,
      },
    });

    const statsMap = new Map(statsResponse.data.items.map(item => [item.id, item.statistics]));
    videos = videos.map(video => ({
      id: video.id.videoId,
      url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      likes: parseInt(statsMap.get(video.id.videoId)?.likeCount || 0),
      comments: parseInt(statsMap.get(video.id.videoId)?.commentCount || 0),
      views: parseInt(statsMap.get(video.id.videoId)?.viewCount || 0),
      engagement: parseInt(statsMap.get(video.id.videoId)?.likeCount || 0) + parseInt(statsMap.get(video.id.videoId)?.commentCount || 0),
    }));

    videos.sort((a, b) => b[metric] - a[metric]);
    return videos.slice(0, 10);
  } catch (error) {
    log('ERROR', `YouTube top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getYouTubeTopPosts };