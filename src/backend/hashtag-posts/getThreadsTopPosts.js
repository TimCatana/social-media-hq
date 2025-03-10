const axios = require('axios');
const { log } = require('../logging/logUtils');

async function getThreadsTopPosts(hashtag, token, metric) {
  const userId = process.env.THREADS_USER_ID || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!userId) throw new Error('THREADS_USER_ID or INSTAGRAM_BUSINESS_ACCOUNT_ID not set in .env');

  if (!['likes', 'comments', 'engagement'].includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Threads; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const response = await axios.get(`https://graph.threads.net/v1.0/${userId}/threads`, {
      params: {
        access_token: token,
        fields: 'id,text,like_count,comments_count,permalink',
        limit: 100,
      },
    });
    let posts = response.data.data || [];

    // Filter posts containing the hashtag/keyword
    posts = posts.filter(post => post.text && post.text.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')));

    // Normalize and sort posts
    posts = posts.map(post => ({
      id: post.id,
      url: post.permalink || `https://threads.net/post/${post.id}`,
      likes: post.like_count || 0,
      comments: post.comments_count || 0,
      views: 0, // Threads API doesn't provide views
      engagement: (post.like_count || 0) + (post.comments_count || 0),
    }));

    posts.sort((a, b) => b[metric] - a[metric]);
    return posts.slice(0, 10);
  } catch (error) {
    log('ERROR', `Threads top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  }
}

module.exports = { getThreadsTopPosts };