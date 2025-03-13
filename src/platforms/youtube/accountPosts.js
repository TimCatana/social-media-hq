const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getYouTubeToken } = require('../../auth/youtube');
const { csvHeader, mapPostToCsvRow, apiFields } = require('./config');
const { METRICS } = require('../../constants');
const axios = require('axios');

async function getYouTubeAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  const accessToken = await getYouTubeToken(config);
  if (!METRICS.youtube.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for YouTube; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    let channelId = account.replace('@', '');
    if (isMyAccount) {
      const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: { part: 'id', mine: true, access_token: accessToken },
      });
      channelId = channelResponse.data.items[0]?.id;
    }

    const url = 'https://www.googleapis.com/youtube/v3/search';
    const videos = await fetchPaginatedData(url, {
      part: 'snippet',
      channelId,
      type: 'video',
      maxResults: 50,
    }, accessToken, verbose, { nextKey: 'nextPageToken' });

    const videoIds = videos.map(v => v.id.videoId).join(',');
    const statsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: { part: 'statistics,snippet', id: videoIds, access_token: accessToken },
    });
    const statsMap = new Map(statsResponse.data.items.map(item => [item.id, { ...item.statistics, ...item.snippet }]));

    const postData = videos.map(video => ({
      id: video.id.videoId,
      created_time: statsMap.get(video.id.videoId)?.publishedAt,
      title: statsMap.get(video.id.videoId)?.title || '',
      description: statsMap.get(video.id.videoId)?.description || '',
      thumbnail_url: statsMap.get(video.id.videoId)?.thumbnails?.default?.url || '',
      likes: parseInt(statsMap.get(video.id.videoId)?.likeCount || 0),
      comments: parseInt(statsMap.get(video.id.videoId)?.commentCount || 0),
      views: parseInt(statsMap.get(video.id.videoId)?.viewCount || 0),
      engagement: parseInt(statsMap.get(video.id.videoId)?.likeCount || 0) + parseInt(statsMap.get(video.id.videoId)?.commentCount || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(mapPostToCsvRow);
    return await writeCsv(`youtube_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeader, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch YouTube posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getYouTubeAccountPosts };