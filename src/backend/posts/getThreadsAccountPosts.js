const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { log } = require('../utils/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getThreadsAccountPosts(account, isMyAccount, metric = 'likes', config, verbose = false) {
  const accessToken = config.tokens.threads?.token;
  const csvPath = path.join(CSV_DIR, `threads_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);

  const validMetrics = ['likes', 'comments', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Threads; defaulting to 'likes'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'likes';
  }

  try {
    let userId = isMyAccount ? config.platforms.threads.INSTAGRAM_BUSINESS_ACCOUNT_ID : account.replace('@', '');
    if (!userId) throw new Error('INSTAGRAM_BUSINESS_ACCOUNT_ID not found in config');

    const posts = [];
    let url = `https://graph.threads.net/v1.0/${userId}/threads`;
    const params = {
      access_token: accessToken,
      fields: 'id,created_time,text,permalink,media_type,media_url,like_count,comments_count',
      limit: 100,
    };

    do {
      if (verbose) log('VERBOSE', `Fetching threads from ${url} with params: ${JSON.stringify(params)}`);
      const response = await axios.get(url, { params });
      posts.push(...(response.data.data || []));
      url = response.data.paging?.next;
    } while (url);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.created_time,
      text: post.text || '',
      permalink: post.permalink || '',
      likes: post.like_count || 0,
      comments: post.comments_count || 0,
      media_type: post.media_type || '',
      media_url: post.media_url || '',
      views: 0, // Not available
      engagement: (post.like_count || 0) + (post.comments_count || 0),
    }));

    if (verbose) log('VERBOSE', `Retrieved ${postData.length} posts for ${account}`);
    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Post ID,Created Time,Text,Permalink,Likes,Comments,Media Type,Media URL,Views,Engagement\n';
    const csvRows = postData.map(post => 
      `"${post.id}","${post.created_time}","${post.text.replace(/"/g, '""')}","${post.permalink}",${post.likes},${post.comments},"${post.media_type}","${post.media_url}",${post.views},${post.engagement}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `Threads posts for ${account} sorted by ${metric} saved to ${csvPath}`);
    if (verbose) log('VERBOSE', `CSV written with ${postData.length} rows`);
    return csvPath;
  } catch (error) {
    log('ERROR', `Threads posts retrieval failed for ${account}: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getThreadsAccountPosts };