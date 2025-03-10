const axios = require('axios');
const prompts = require('prompts');
const fs = require('fs').promises;
const path = require('path');
const { getFacebookToken } = require('../auth/facebookAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');

async function getFacebookCompetitorPosts(competitor) {
  const config = await loadConfig();
  const accessToken = await getFacebookToken(config);
  const csvPath = path.join(__dirname, '..', '..', 'bin', 'csv', 'facebook_competitor_analysis.csv');

  try {
    // Fetch competitor page ID from username (if not numeric)
    let pageId = competitor;
    if (!/^\d+$/.test(competitor)) {
      const pageResponse = await axios.get(
        `https://graph.facebook.com/v20.0/${competitor}`,
        { params: { access_token: accessToken, fields: 'id' } }
      );
      pageId = pageResponse.data.id;
    }

    // Batch fetch posts
    const postsResponse = await axios.get(
      `https://graph.facebook.com/v20.0/${pageId}/posts`,
      { params: { access_token: accessToken, fields: 'id,created_time,likes.summary(true),comments.summary(true),shares' } }
    );
    const posts = postsResponse.data.data;

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.created_time,
      likes: post.likes?.summary.total_count || 0,
      comments: post.comments?.summary.total_count || 0,
      shares: post.shares?.count || 0
    }));

    const { sortBy } = await prompts({
      type: 'select',
      name: 'sortBy',
      message: 'Sort Facebook competitor posts by:',
      choices: [
        { title: 'Likes', value: 'likes' },
        { title: 'Comments', value: 'comments' },
        { title: 'Shares', value: 'shares' }
      ]
    }, { onCancel: () => process.exit(1) });

    postData.sort((a, b) => b[sortBy] - a[sortBy]);

    const csvHeader = 'Post ID,Created Time,Likes,Comments,Shares\n';
    const csvRows = postData.map(post => 
      `${post.id},${post.created_time},${post.likes},${post.comments},${post.shares}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    console.log(`Facebook competitor posts sorted by ${sortBy} saved to ${csvPath}`);
    await saveConfig(config);
  } catch (error) {
    console.error(`Facebook competitor analysis failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }
}

module.exports = { getFacebookCompetitorPosts };