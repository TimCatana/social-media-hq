const axios = require('axios');
const prompts = require('prompts');
const fs = require('fs').promises;
const path = require('path');
const { getInstagramToken } = require('../auth/instagramAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');

async function getThreadsCompetitorPosts(competitor) {
  const config = await loadConfig();
  const accessToken = await getInstagramToken(config);
  const csvPath = path.join(__dirname, '..', '..', 'bin', 'csv', 'threads_competitor_analysis.csv');

  try {
    // Fetch competitor Threads posts (assumes Threads API is tied to Instagram)
    const postsResponse = await axios.get(
      `https://graph.facebook.com/v20.0/${competitor}/threads`,
      { params: { access_token: accessToken, fields: 'id,timestamp,like_count,replies_count' } }
    );
    const posts = postsResponse.data.data;

    const postData = posts.map(post => ({
      id: post.id,
      timestamp: post.timestamp,
      likes: post.like_count || 0,
      replies: post.replies_count || 0
    }));

    const { sortBy } = await prompts({
      type: 'select',
      name: 'sortBy',
      message: 'Sort Threads competitor posts by:',
      choices: [
        { title: 'Likes', value: 'likes' },
        { title: 'Replies', value: 'replies' }
      ]
    }, { onCancel: () => process.exit(1) });

    postData.sort((a, b) => b[sortBy] - a[sortBy]);

    const csvHeader = 'Post ID,Timestamp,Likes,Replies\n';
    const csvRows = postData.map(post => 
      `${post.id},${post.timestamp},${post.likes},${post.replies}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    console.log(`Threads competitor posts sorted by ${sortBy} saved to ${csvPath}`);
    await saveConfig(config);
  } catch (error) {
    console.error(`Threads competitor analysis failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }
}

module.exports = { getThreadsCompetitorPosts };