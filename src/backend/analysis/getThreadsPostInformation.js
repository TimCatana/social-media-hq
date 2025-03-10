const axios = require('axios');
const prompts = require('prompts');
const fs = require('fs').promises;
const path = require('path');
const { getInstagramToken } = require('../auth/instagramAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');

async function getThreadsPostInformation() {
  const config = await loadConfig();
  const accessToken = await getInstagramToken(config); // Threads uses Instagram auth
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID; // Same as Instagram
  const csvPath = path.join(__dirname, '..', '..', 'bin', 'csv', 'threads_post_analysis.csv');

  try {
    // Fetch Threads posts (using Instagram Graph API, Threads-specific endpoint)
    const postsResponse = await axios.get(
      `https://graph.facebook.com/v20.0/${igUserId}/threads`,
      { params: { access_token: accessToken, fields: 'id,timestamp' } }
    );
    const posts = postsResponse.data.data;

    const postData = await Promise.all(posts.map(async (post) => {
      const insightsResponse = await axios.get(
        `https://graph.facebook.com/v20.0/${post.id}/insights`,
        {
          params: {
            access_token: accessToken,
            metric: 'likes,views,replies'
          }
        }
      );
      const insights = insightsResponse.data.data;
      return {
        id: post.id,
        timestamp: post.timestamp,
        likes: insights.find(i => i.name === 'likes')?.values[0].value || 0,
        views: insights.find(i => i.name === 'views')?.values[0].value || 0,
        replies: insights.find(i => i.name === 'replies')?.values[0].value || 0
      };
    }));

    const { sortBy } = await prompts({
      type: 'select',
      name: 'sortBy',
      message: 'Sort Threads posts by:',
      choices: [
        { title: 'Likes', value: 'likes' },
        { title: 'Views', value: 'views' },
        { title: 'Replies', value: 'replies' }
      ]
    }, { onCancel: () => process.exit(1) });

    postData.sort((a, b) => b[sortBy] - a[sortBy]);

    const csvHeader = 'Post ID,Timestamp,Likes,Views,Replies\n';
    const csvRows = postData.map(post => 
      `${post.id},${post.timestamp},${post.likes},${post.views},${post.replies}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    console.log(`Threads posts sorted by ${sortBy} saved to ${csvPath}`);
    await saveConfig(config);
  } catch (error) {
    console.error(`Threads analysis failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }
}

module.exports = { getThreadsPostInformation };