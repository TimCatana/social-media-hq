const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { log } = require('../utils/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getYouTubeAccountPosts(account, isMyAccount, metric = 'likes', config, verbose = false) {
  const accessToken = config.tokens.youtube?.token;
  const csvPath = path.join(CSV_DIR, `youtube_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);

  const validMetrics = ['likes', 'comments', 'views', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for YouTube; defaulting to 'likes'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'likes';
  }

  try {
    let channelId = account.replace('@', '');
    if (isMyAccount) {
      if (verbose) log('VERBOSE', 'Fetching my YouTube channel ID');
      const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { part: 'id', mine: true },
      });
      channelId = channelResponse.data.items[0]?.id;
      if (!channelId) throw new Error('Could not fetch my YouTube channel ID');
    } else if (account.startsWith('@')) {
      if (verbose) log('VERBOSE', `Resolving YouTube channel ID for ${account}`);
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
      if (verbose) log('VERBOSE', `Fetching videos for channel ${channelId} with pageToken: ${pageToken || 'none'}`);
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
    if (verbose) log('VERBOSE', `Fetching statistics for ${videos.length} videos`);
    const statsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        part: 'statistics,snippet',
        id: videoIds,
      },
    });

    const statsMap = new Map(statsResponse.data.items.map(item => [item.id, { ...item.statistics, ...item.snippet }]));
    const postData = videos.map(video => ({
      id: video.id.videoId,
      created_time: video.snippet.publishedAt,
      title: statsMap.get(video.id.videoId)?.title || '',
      description: statsMap.get(video.id.videoId)?.description || '',
      thumbnail_url: statsMap.get(video.id.videoId)?.thumbnails?.default?.url || '',
      likes: parseInt(statsMap.get(video.id.videoId)?.likeCount || 0),
      comments: parseInt(statsMap.get(video.id.videoId)?.commentCount || 0),
      views: parseInt(statsMap.get(video.id.videoId)?.viewCount || 0),
      engagement: parseInt(statsMap.get(video.id.videoId)?.likeCount || 0) + parseInt(statsMap.get(video.id.videoId)?.commentCount || 0),
    }));

    if (verbose) log('VERBOSE', `Retrieved ${postData.length} videos for ${account}`);
    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Video ID,Created Time,Title,Description,Thumbnail URL,Likes,Comments,Views,Engagement\n';
    const csvRows = postData.map(post => 
      `"${post.id}","${post.created_time}","${post.title.replace(/"/g, '""')}","${post.description.replace(/"/g, '""')}","${post.thumbnail_url}",${post.likes},${post.comments},${post.views},${post.engagement}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `YouTube videos for ${account} sorted by ${metric} saved to ${csvPath}`);
    if (verbose) log('VERBOSE', `CSV written with ${postData.length} rows`);
    return csvPath;
  } catch (error) {
    log('ERROR', `YouTube posts retrieval failed for ${account}: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getYouTubeAccountPosts };