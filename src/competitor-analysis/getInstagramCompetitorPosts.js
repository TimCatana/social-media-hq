const axios = require('axios');
const prompts = require('prompts');
const fs = require('fs').promises;
const path = require('path');
const { getInstagramToken } = require('../auth/instagramAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');

async function getInstagramCompetitorPosts(competitor) {
  const config = await loadConfig();
  const accessToken = await getInstagramToken(config);
  const csvPath = path.join(__dirname, '..', '..', 'bin', 'csv', 'instagram_competitor_analysis.csv');

  try {
    // Fetch competitor user ID from username
    const userResponse = await axios.get(
      `https://graph.facebook.com/v20.0/ig_users/search`,
      { params: { q: competitor, access_token: accessToken } }
    );
    const userId = userResponse.data.data[0]?.id;

    if (!userId) throw new Error(`Could not find Instagram user: ${competitor}`);

    // Fetch public posts
    const postsResponse = await axios.get(
      `https://graph.facebook.com/v20.0/${userId}/media`,
      { params: { access_token: accessToken, fields: 'id,timestamp,like_count,comments_count' } }
    );
    const posts = postsResponse.data.data;

    const postData = posts.map(post => ({
      id: post.id,
      timestamp: post.timestamp,
      likes: post.like_count || 0,
      comments: post.comments_count || 0
    }));

    const { sortBy } = await prompts({
      type: 'select',
      name: 'sortBy',
      message: 'Sort Instagram competitor posts by:',
      choices: [
        { title: 'Likes', value: 'likes' },
        { title: 'Comments', value: 'comments' }
      ]
    }, { onCancel: () => process.exit(1) });

    postData.sort((a, b) => b[sortBy] - a[sortBy]);

    const csvHeader = 'Post ID,Timestamp,Likes,Comments\n';
    const csvRows = postData.map(post => 
      `${post.id},${post.timestamp},${post.likes},${post.comments}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    console.log(`Instagram competitor posts sorted by ${sortBy} saved to ${csvPath}`);
    await saveConfig(config);
  } catch (error) {
    console.error(`Instagram competitor analysis failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }
}

module.exports = { getInstagramCompetitorPosts };