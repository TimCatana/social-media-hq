const axios = require('axios');
const prompts = require('prompts');
const fs = require('fs').promises;
const path = require('path');
const { getYouTubeToken } = require('../auth/youtubeAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');

async function getYouTubePostInformation() {
  const config = await loadConfig();
  const accessToken = await getYouTubeToken(config);
  const csvPath = path.join(__dirname, '..', '..', 'bin', 'csv', 'youtube_post_analysis.csv');

  try {
    // Fetch channel videos
    const channelsResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/channels',
      {
        params: { part: 'contentDetails', mine: true, access_token: accessToken }
      }
    );
    const uploadsPlaylistId = channelsResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

    const videosResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/playlistItems',
      {
        params: {
          part: 'snippet',
          playlistId: uploadsPlaylistId,
          maxResults: 50,
          access_token: accessToken
        }
      }
    );
    const videos = videosResponse.data.items;

    const videoData = await Promise.all(videos.map(async (video) => {
      const statsResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/videos',
        {
          params: {
            part: 'statistics',
            id: video.snippet.resourceId.videoId,
            access_token: accessToken
          }
        }
      );
      const stats = statsResponse.data.items[0].statistics;
      return {
        id: video.snippet.resourceId.videoId,
        published_at: video.snippet.publishedAt,
        views: parseInt(stats.viewCount) || 0,
        likes: parseInt(stats.likeCount) || 0,
        comments: parseInt(stats.commentCount) || 0
      };
    }));

    const { sortBy } = await prompts({
      type: 'select',
      name: 'sortBy',
      message: 'Sort YouTube videos by:',
      choices: [
        { title: 'Views', value: 'views' },
        { title: 'Likes', value: 'likes' },
        { title: 'Comments', value: 'comments' }
      ]
    }, { onCancel: () => process.exit(1) });

    videoData.sort((a, b) => b[sortBy] - a[sortBy]);

    const csvHeader = 'Video ID,Published At,Views,Likes,Comments\n';
    const csvRows = videoData.map(video => 
      `${video.id},${video.published_at},${video.views},${video.likes},${video.comments}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    console.log(`YouTube videos sorted by ${sortBy} saved to ${csvPath}`);
    await saveConfig(config);
  } catch (error) {
    console.error(`YouTube analysis failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }
}

module.exports = { getYouTubePostInformation };