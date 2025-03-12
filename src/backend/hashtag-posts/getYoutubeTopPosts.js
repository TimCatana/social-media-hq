const axios = require('axios');
const { log } = require('../utils/logUtils');

async function getYouTubeTopPosts(hashtag, token, metric, verbose = false) {
  const validMetrics = ['likes', 'comments', 'views', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for YouTube; defaulting to 'engagement'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'engagement';
  }

  try {
    const videos = [];
    let pageToken;
    do {
      if (verbose) log('VERBOSE', `Fetching videos with pageToken: ${pageToken || 'none'}`);
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          part: 'snippet',
          q: hashtag,
          type: 'video',
          maxResults: 50,
          pageToken,
        },
      });
      videos.push(...(response.data.items || []));
      pageToken = response.data.nextPageToken;
    } while (pageToken && videos.length < 200);

    const videoIds = videos.map(video => video.id.videoId).join(',');
    if (verbose) log('VERBOSE', `Fetching statistics for ${videos.length} videos`);
    const statsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        part: 'statistics,snippet',
        id: videoIds,
      },
    });

    const statsMap = new Map(statsResponse.data.items.map(item => [item.id, { ...item.statistics, ...item.snippet }]));
    const normalizedVideos = videos.map(video => ({
      id: video.id.videoId,
      created_time: statsMap.get(video.id.videoId)?.publishedAt || '',
      title: statsMap.get(video.id.videoId)?.title || '',
      url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      likes: parseInt(statsMap.get(video.id.videoId)?.likeCount || 0),
      comments: parseInt(statsMap.get(video.id.videoId)?.commentCount || 0),
      views: parseInt(statsMap.get(video.id.videoId)?.viewCount || 0),
      engagement: parseInt(statsMap.get(video.id.videoId)?.likeCount || 0) + parseInt(statsMap.get(video.id.videoId)?.commentCount || 0),
    }));

    if (verbose) log('VERBOSE', `Retrieved ${normalizedVideos.length} videos for hashtag '${hashtag}'`);
    normalizedVideos.sort((a, b) => b[metric] - a[metric]);
    return normalizedVideos.slice(0, 10);
  } catch (error) {
    log('ERROR', `YouTube top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getYouTubeTopPosts };