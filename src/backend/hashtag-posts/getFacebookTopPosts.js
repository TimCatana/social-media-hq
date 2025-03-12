const axios = require('axios');
const { log } = require('../utils/logUtils');

async function getFacebookTopPosts(hashtag, token, metric, verbose = false) {
  const pageId = process.env.FACEBOOK_PAGE_ID || 'me'; // Fallback to authenticated user’s page
  const validMetrics = ['likes', 'comments', 'shares', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Facebook; defaulting to 'engagement'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'engagement';
  }

  try {
    const posts = [];
    let url = `https://graph.facebook.com/v20.0/${pageId}/posts`;
    const params = {
      access_token: token,
      fields: 'id,created_time,message,permalink_url,reactions.summary(total_count),comments.summary(total_count),shares',
      limit: 100,
    };

    do {
      if (verbose) log('VERBOSE', `Fetching posts from ${url}`);
      const response = await axios.get(url, { params });
      posts.push(...(response.data.data || []));
      url = response.data.paging?.next;
    } while (url);

    let filteredPosts = posts.filter(post => post.message && post.message.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')));
    if (verbose) log('VERBOSE', `Filtered ${filteredPosts.length} posts containing '${hashtag}' from ${posts.length} total`);

    filteredPosts = filteredPosts.map(post => ({
      id: post.id,
      created_time: post.created_time,
      message: post.message || '',
      url: post.permalink_url,
      likes: post.reactions?.summary.total_count || 0,
      comments: post.comments?.summary.total_count || 0,
      shares: post.shares?.count || 0,
      engagement: (post.reactions?.summary.total_count || 0) + (post.comments?.summary.total_count || 0) + (post.shares?.count || 0),
    }));

    filteredPosts.sort((a, b) => b[metric] - a[metric]);
    return filteredPosts.slice(0, 10);
  } catch (error) {
    log('ERROR', `Facebook top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getFacebookTopPosts };