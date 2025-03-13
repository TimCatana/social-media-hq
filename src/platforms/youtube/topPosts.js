const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getYouTubeToken } = require('../../auth/youtube');
const { csvHeaderTopPosts, mapTopPostToCsvRow } = require('./config');
const { METRICS } = require('../../constants');
const axios = require('axios');

async function getYouTubeTopPosts(hashtag, metric, config, verbose = false) {
  const accessToken = await getYouTubeToken(config);
  if (!METRICS.youtube.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for YouTube; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const url = 'https://www.googleapis.com/youtube/v3/search';
    const videos = await fetchPaginatedData(url, {
      part: 'snippet',
      q: hashtag,
      type: 'video',
      maxResults: 50,
    }, accessToken, verbose, { nextKey: 'nextPageToken' });

    const videoIds = videos.map(v => v.id.videoId).join(',');
    const statsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: { part: 'statistics,snippet', id: videoIds, access_token: accessToken },
    });
    const statsMap = new Map(statsResponse.data.items.map(item => [item.id, { ...item.statistics, ...item.snippet }]));

    const topPosts = videos
      .map(video => ({
        id: video.id.videoId,
        created_time: statsMap.get(video.id.videoId)?.publishedAt,
        title: statsMap.get(video.id.videoId)?.title || '',
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        likes: parseInt(statsMap.get(video.id.videoId)?.likeCount || 0),
        comments: parseInt(statsMap.get(video.id.videoId)?.commentCount || 0),
        views: parseInt(statsMap.get(video.id.videoId)?.viewCount || 0),
        engagement: parseInt(statsMap.get(video.id.videoId)?.likeCount || 0) + parseInt(statsMap.get(video.id.videoId)?.commentCount || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = topPosts.map(mapTopPostToCsvRow);
    return await writeCsv(`youtube_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeaderTopPosts, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch YouTube top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getYouTubeTopPosts };