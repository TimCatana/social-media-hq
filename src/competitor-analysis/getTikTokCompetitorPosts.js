const axios = require('axios');
const prompts = require('prompts');
const fs = require('fs').promises;
const path = require('path');
const { getTikTokToken } = require('../auth/tiktokAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');

async function getTikTokCompetitorPosts(competitor) {
  const config = await loadConfig();
  const accessToken = await getTikTokToken(config);
  const csvPath = path.join(__dirname, '..', '..', 'bin', 'csv', 'tiktok_competitor_analysis.csv');

  try {
    // Fetch competitor user info to get ID (TikTok API requires numeric ID)
    const userResponse = await axios.get(
      `https://open.tiktokapis.com/v2/user/info/`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: { fields: 'open_id', username: competitor }
      }
    );
    const userId = userResponse.data.data.user.open_id;

    // Fetch competitor videos
    const videosResponse = await axios.post(
      'https://open.tiktokapis.com/v2/video/list/',
      { user_id: userId, fields: ['id', 'create_time', 'like_count', 'comment_count', 'share_count'] },
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const videos = videosResponse.data.data.videos;

    const videoData = videos.map(video => ({
      id: video.id,
      create_time: video.create_time,
      likes: video.like_count || 0,
      comments: video.comment_count || 0,
      shares: video.share_count || 0
    }));

    const { sortBy } = await prompts({
      type: 'select',
      name: 'sortBy',
      message: 'Sort TikTok competitor videos by:',
      choices: [
        { title: 'Likes', value: 'likes' },
        { title: 'Comments', value: 'comments' },
        { title: 'Shares', value: 'shares' }
      ]
    }, { onCancel: () => process.exit(1) });

    videoData.sort((a, b) => b[sortBy] - a[sortBy]);

    const csvHeader = 'Video ID,Create Time,Likes,Comments,Shares\n';
    const csvRows = videoData.map(video => 
      `${video.id},${video.create_time},${video.likes},${video.comments},${video.shares}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    console.log(`TikTok competitor videos sorted by ${sortBy} saved to ${csvPath}`);
    await saveConfig(config);
  } catch (error) {
    console.error(`TikTok competitor analysis failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }
}

module.exports = { getTikTokCompetitorPosts };