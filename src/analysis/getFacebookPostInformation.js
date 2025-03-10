const axios = require('axios');
const prompts = require('prompts');
const fs = require('fs').promises;
const path = require('path');
const { getFacebookToken } = require('../auth/facebookAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');

async function getFacebookPostInformation() {
  const config = await loadConfig();
  const accessToken = await getFacebookToken(config);
  const pageId = process.env.PAGE_ID; // 283700924817485
  const csvPath = path.join(__dirname, '..', '..', 'bin', 'csv', 'facebook_post_analysis.csv');

  try {
    const postsResponse = await axios.get(
      `https://graph.facebook.com/v20.0/${pageId}/posts`,
      { params: { access_token: accessToken, fields: 'id,created_time' } }
    );
    const posts = postsResponse.data.data;

    const postData = await Promise.all(posts.map(async (post) => {
      const insightsResponse = await axios.get(
        `https://graph.facebook.com/v20.0/${post.id}/insights`,
        {
          params: {
            access_token: accessToken,
            metric: 'post_impressions,post_engaged_users,post_reactions_like_total'
          }
        }
      );
      const insights = insightsResponse.data.data;
      return {
        id: post.id,
        created_time: post.created_time,
        impressions: insights.find(i => i.name === 'post_impressions')?.values[0].value || 0,
        engagement: insights.find(i => i.name === 'post_engaged_users')?.values[0].value || 0,
        likes: insights.find(i => i.name === 'post_reactions_like_total')?.values[0].value || 0
      };
    }));

    const { sortBy } = await prompts({
      type: 'select',
      name: 'sortBy',
      message: 'Sort Facebook posts by:',
      choices: [
        { title: 'Likes', value: 'likes' },
        { title: 'Impressions', value: 'impressions' },
        { title: 'Engagement', value: 'engagement' }
      ]
    }, { onCancel: () => process.exit(1) });

    postData.sort((a, b) => b[sortBy] - a[sortBy]);

    const csvHeader = 'Post ID,Created Time,Likes,Impressions,Engagement\n';
    const csvRows = postData.map(post => 
      `${post.id},${post.created_time},${post.likes},${post.impressions},${post.engagement}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    console.log(`Facebook posts sorted by ${sortBy} saved to ${csvPath}`);
    await saveConfig(config);
  } catch (error) {
    console.error(`Facebook analysis failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }
}

module.exports = { getFacebookPostInformation };