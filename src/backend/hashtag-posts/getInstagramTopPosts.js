const axios = require('axios');
const { log } = require('../logging/logUtils');

async function getInstagramTopPosts(hashtag, token, metric) {
  if (!['likes', 'comments', 'engagement'].includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Instagram; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    // Get hashtag ID
    const hashtagIdResponse = await axios.get('https://graph.facebook.com/v20.0/ig_hashtag_search', {
      params: {
        user_id: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
        q: hashtag.replace('#', ''),
        access_token: token,
      },
    });
    const hashtagId = hashtagIdResponse.data.data[0]?.id;
    if (!hashtagId) throw new Error(`Hashtag '${hashtag}' not found`);

    // Get recent media for the hashtag
    const mediaResponse = await axios.get(`https://graph.facebook.com/v20.0/${hashtagId}/recent_media`, {
      params: {
        user_id: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
        fields: 'id,like_count,comments_count,permalink',
        access_token: token,
        limit: 50,
      },
    });
    let posts = mediaResponse.data.data || [];

    // Normalize and sort posts
    posts = posts.map(post => ({
      id: post.id,
      url: post.permalink,
      likes: post.like_count || 0,
      comments: post.comments_count || 0,
      views: 0, // Instagram Graph API doesn't provide views for hashtag media
      engagement: (post.like_count || 0) + (post.comments_count || 0),
    }));

    posts.sort((a, b) => b[metric] - a[metric]);
    return posts.slice(0, 10);
  } catch (error) {
    log('ERROR', `Instagram top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getInstagramTopPosts };