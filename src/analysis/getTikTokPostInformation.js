const axios = require('axios');
const prompts = require('prompts');
const fs = require('fs').promises;
const path = require('path');
const { getTikTokToken } = require('../auth/tiktokAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');

async function getTikTokPostInformation() {
  const config = await loadConfig();
  const accessToken = await getTikTokToken(config);
  const csvPath = path.join(__dirname, '..', '..', 'bin', 'csv', 'tiktok_post_analysis.csv');

  try {
    const videosResponse = await axios.post(
      'https://open.tiktokapis.com/v2/video/list/',
      { fields: ['id', 'create_time'] },
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const videos = videosResponse.data.data.videos;

    const videoData = await Promise.all(videos.map(async (video) => {
      const insightsResponse = await axios.post(
        'https://open.tiktokapis.com/v2/video/insights/',
        { video_id: video.id },
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const insights = insightsResponse.data.data;
      return {
        id: video.id,
        create_time: video.create_time,
        views: insights?.play_count || 0,
        likes: insights?.like_count || 0,
        comments: insights?.comment_count || 0,
        shares: insights?.share_count || 0
      };
    }));

    const { sortBy } = await prompts({
      type: 'select',
      name: 'sortBy',
      message: 'Sort TikTok videos by:',
      choices: [
        { title: 'Views', value: 'views' },
        { title: 'Likes', value: 'likes' },
        { title: 'Comments', value: 'comments' },
        { title: 'Shares', value: 'shares' }
      ]
    }, { onCancel: () => process.exit(1) });

    videoData.sort((a, b) => b[sortBy] - a[sortBy]);

    const csvHeader = 'Video ID,Create Time,Views,Likes,Comments,Shares\n';
    const csvRows = videoData.map(video => 
      `${video.id},${video.create_time},${video.views},${video.likes},${video.comments},${video.shares}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    console.log(`TikTok videos sorted by ${sortBy} saved to ${csvPath}`);
    await saveConfig(config);
  } catch (error) {
    console.error(`TikTok analysis failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }
}

module.exports = { getTikTokPostInformation };