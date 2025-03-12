const axios = require('axios');
const { log } = require('../utils/logUtils');

async function getThreadsTopPosts(hashtag, token, metric, verbose = false) {
  const userId = process.env.THREADS_USER_ID || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!userId) throw new Error('THREADS_USER_ID or INSTAGRAM_BUSINESS_ACCOUNT_ID not set');

  const validMetrics = ['likes', 'comments', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Threads; defaulting to 'engagement'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'engagement';
  }

  try {
    const posts = [];
    let url = `https://graph.threads.net/v1.0/${userId}/threads`;
    const params = {
      access_token: token,
      fields: 'id,created_time,text,permalink,like_count,comments_count',
      limit: 100,
    };

    do {
      if (verbose) log('VERBOSE', `Fetching threads from ${url}`);
      const response = await axios.get(url, { params });
      posts.push(...(response.data.data || []));
      url = response.data.paging?.next;
    } while (url && posts.length < 200);

    const filteredPosts = posts.filter(post => post.text && post.text.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')));
    if (verbose) log('VERBOSE', `Filtered ${filteredPosts.length} posts containing '${hashtag}' from ${posts.length} total`);

    const normalizedPosts = filteredPosts.map(post => ({
      id: post.id,
      created_time: post.created_time,
      text: post.text || '',
      url: post.permalink,
      likes: post.like_count || 0,
      comments: post.comments_count || 0,
      engagement: (post.like_count || 0) + (post.comments_count || 0),
    }));

    normalizedPosts.sort((a, b) => b[metric] - a[metric]);
    return normalizedPosts.slice(0, 10);
  } catch (error) {
    log('ERROR', `Threads top posts retrieval failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getThreadsTopPosts };