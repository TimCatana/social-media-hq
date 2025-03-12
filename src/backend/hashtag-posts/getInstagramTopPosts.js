const axios = require('axios');
const { log } = require('../utils/logUtils');

async function getInstagramTopPosts(hashtag, token, metric, verbose = false) {
  const validMetrics = ['likes', 'comments', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Instagram; defaulting to 'engagement'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'engagement';
  }

  try {
    const userId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    if (!userId) throw new Error('INSTAGRAM_BUSINESS_ACCOUNT_ID not set');

    if (verbose) log('VERBOSE', `Searching hashtag: ${hashtag}`);
    const hashtagIdResponse = await axios.get('https://graph.facebook.com/v20.0/ig_hashtag_search', {
      params: {
        user_id: userId,
        q: hashtag.replace('#', ''),
        access_token: token,
      },
    });
    const hashtagId = hashtagIdResponse.data.data[0]?.id;
    if (!hashtagId) throw new Error(`Hashtag '${hashtag}' not found`);

    const posts = [];
    let url = `https://graph.facebook.com/v20.0/${hashtagId}/top_media`;
    const params = {
      user_id: userId,
      fields: 'id,timestamp,caption,permalink,like_count,comments_count',
      access_token: token,
      limit: 50,
    };

    do {
      if (verbose) log('VERBOSE', `Fetching top media from ${url}`);
      const response = await axios.get(url, { params });
      posts.push(...(response.data.data || []));
      url = response.data.paging?.next;
    } while (url && posts.length < 100); // Cap at 100 to avoid infinite loops

    const normalizedPosts = posts.map(post => ({
      id: post.id,
      created_time: post.timestamp,
      caption: post.caption || '',
      url: post.permalink,
      likes: post.like_count || 0,
      comments: post.comments_count || 0,
      engagement: (post.like_count || 0) + (post.comments_count || 0),
    }));

    if (verbose) log('VERBOSE', `Retrieved ${normalizedPosts.length} posts for hashtag '${hashtag}'`);
    normalizedPosts.sort((a, b) => b[metric] - a[metric]);
    return normalizedPosts.slice(0, 10);
  } catch (error) {
    log('ERROR', `Instagram top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getInstagramTopPosts };