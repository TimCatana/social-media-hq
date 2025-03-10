const axios = require('axios');
const { log } = require('../logging/logUtils');

async function getFacebookTopPosts(hashtag, token, metric) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  if (!pageId) throw new Error('FACEBOOK_PAGE_ID not set in .env');

  if (!['likes', 'comments', 'engagement'].includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Facebook; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const response = await axios.get(`https://graph.facebook.com/v20.0/${pageId}/posts`, {
      params: {
        access_token: token,
        fields: 'id,message,permalink_url,reactions.summary(total_count),comments.summary(total_count)',
        limit: 100,
      },
    });
    let posts = response.data.data || [];

    // Filter posts containing the hashtag/keyword
    posts = posts.filter(post => post.message && post.message.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')));

    // Normalize and sort posts
    posts = posts.map(post => ({
      id: post.id,
      url: post.permalink_url,
      likes: post.reactions?.summary.total_count || 0,
      comments: post.comments?.summary.total_count || 0,
      views: 0, // Facebook Graph API doesn't provide views for posts in this endpoint
      engagement: (post.reactions?.summary.total_count || 0) + (post.comments?.summary.total_count || 0),
    }));

    posts.sort((a, b) => b[metric] - a[metric]);
    return posts.slice(0, 10);
  } catch (error) {
    log('ERROR', `Facebook top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getFacebookTopPosts };