const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { getYouTubeToken } = require('../auth/youtubeAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');
const { log } = require('../logging/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getYouTubeAccountPosts(account, isMyAccount, metric = 'likes') {
  const config = await loadConfig();
  const accessToken = await getYouTubeToken(config);
  const csvPath = path.join(CSV_DIR, 'youtube_competitor_analysis.csv');

  const validMetrics = ['likes', 'comments', 'views', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for YouTube; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    let channelId = isMyAccount ? process.env.YOUTUBE_CHANNEL_ID : account.replace('@', '');
    if (!channelId) throw new Error('YOUTUBE_CHANNEL_ID not set in .env for my account');

    // Resolve handle to channel ID if needed
    if (!isMyAccount && account.startsWith('@')) {
      const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          part: 'snippet',
          q: account,
          type: 'channel',
          maxResults: 1,
        },
      });
      channelId = searchResponse.data.items[0]?.id.channelId;
      if (!channelId) throw new Error(`Could not resolve YouTube channel ID for ${account}`);
    }

    const videos = [];
    let pageToken;
    do {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          part: 'snippet',
          channelId: channelId,
          type: 'video',
          maxResults: 50,
          pageToken: pageToken,
        },
      });
      videos.push(...(response.data.items || []));
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    const videoIds = videos.map(video => video.id.videoId).join(',');
    const statsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        part: 'statistics',
        id: videoIds,
      },
    });

    const statsMap = new Map(statsResponse.data.items.map(item => [item.id, item.statistics]));
    const postData = videos.map(video => ({
      id: video.id.videoId,
      created_time: video.snippet.publishedAt,
      likes: parseInt(statsMap.get(video.id.videoId)?.likeCount || 0),
      comments: parseInt(statsMap.get(video.id.videoId)?.commentCount || 0),
      views: parseInt(statsMap.get(video.id.videoId)?.viewCount || 0),
      engagement: parseInt(statsMap.get(video.id.videoId)?.likeCount || 0) + parseInt(statsMap.get(video.id.videoId)?.commentCount || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Video ID,Created Time,Likes,Comments,Views\n';
    const csvRows = postData.map(post => 
      `${post.id},${post.created_time},${post.likes},${post.comments},${post.views}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `YouTube videos sorted by ${metric} saved to ${csvPath}`);
    await saveConfig(config);
    return csvPath;
  } catch (error) {
    log('ERROR', `YouTube account posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getYouTubeAccountPosts };