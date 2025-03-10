const axios = require('axios');
const prompts = require('prompts');
const fs = require('fs').promises;
const path = require('path');
const { getRumbleToken } = require('../auth/rumbleAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');

async function getRumblePostInformation() {
  const config = await loadConfig();
  const accessToken = await getRumbleToken(config);
  const csvPath = path.join(__dirname, '..', '..', 'bin', 'csv', 'rumble_post_analysis.csv');

  try {
    // Rumble API doesn’t have a public endpoint for user videos; assuming a custom endpoint or proxy
    // This is a placeholder—Rumble’s API isn’t fully public, so you’d need their private API or scrape
    const videosResponse = await axios.get(
      'https://api.rumble.com/v1/videos', // Hypothetical endpoint
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const videos = videosResponse.data.videos; // Adjust based on actual response

    const videoData = videos.map(video => ({
      id: video.id,
      created_at: video.created_at,
      views: video.views || 0,
      likes: video.likes || 0,
      comments: video.comments || 0
    }));

    const { sortBy } = await prompts({
      type: 'select',
      name: 'sortBy',
      message: 'Sort Rumble videos by:',
      choices: [
        { title: 'Views', value: 'views' },
        { title: 'Likes', value: 'likes' },
        { title: 'Comments', value: 'comments' }
      ]
    }, { onCancel: () => process.exit(1) });

    videoData.sort((a, b) => b[sortBy] - a[sortBy]);

    const csvHeader = 'Video ID,Created At,Views,Likes,Comments\n';
    const csvRows = videoData.map(video => 
      `${video.id},${video.created_at},${video.views},${video.likes},${video.comments}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    console.log(`Rumble videos sorted by ${sortBy} saved to ${csvPath}`);
    await saveConfig(config);
  } catch (error) {
    console.error(`Rumble analysis failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }
}

module.exports = { getRumblePostInformation };