const axios = require('axios');
const prompts = require('prompts');
const fs = require('fs').promises;
const path = require('path');
const { getInstagramToken } = require('../auth/instagramAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');

async function getInstagramPostInformation() {
  const config = await loadConfig();
  const accessToken = await getInstagramToken(config);
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID; // 17841465604072114
  const csvPath = path.join(__dirname, '..', '..', 'bin', 'csv', 'instagram_post_analysis.csv');

  try {
    const postsResponse = await axios.get(
      `https://graph.facebook.com/v20.0/${igUserId}/media`,
      { params: { access_token: accessToken, fields: 'id,timestamp' } }
    );
    const posts = postsResponse.data.data;

    const postData = await Promise.all(posts.map(async (post) => {
      const insightsResponse = await axios.get(
        `https://graph.facebook.com/v20.0/${post.id}/insights`,
        {
          params: {
            access_token: accessToken,
            metric: 'impressions,likes,engagement'
          }
        }
      );
      const insights = insightsResponse.data.data;
      return {
        id: post.id,
        timestamp: post.timestamp,
        impressions: insights.find(i => i.name === 'impressions')?.values[0].value || 0,
        likes: insights.find(i => i.name === 'likes')?.values[0].value || 0,
        engagement: insights.find(i => i.name === 'engagement')?.values[0].value || 0
      };
    }));

    const { sortBy } = await prompts({
      type: 'select',
      name: 'sortBy',
      message: 'Sort Instagram posts by:',
      choices: [
        { title: 'Likes', value: 'likes' },
        { title: 'Impressions', value: 'impressions' },
        { title: 'Engagement', value: 'engagement' }
      ]
    }, { onCancel: () => process.exit(1) });

    postData.sort((a, b) => b[sortBy] - a[sortBy]);

    const csvHeader = 'Post ID,Timestamp,Likes,Impressions,Engagement\n';
    const csvRows = postData.map(post => 
      `${post.id},${post.timestamp},${post.likes},${post.impressions},${post.engagement}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    console.log(`Instagram posts sorted by ${sortBy} saved to ${csvPath}`);
    await saveConfig(config);
  } catch (error) {
    console.error(`Instagram analysis failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }
}

module.exports = { getInstagramPostInformation };