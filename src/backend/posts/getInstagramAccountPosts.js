const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { log } = require('../utils/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getInstagramAccountPosts(account, isMyAccount, metric = 'likes', config, verbose = false) {
  const accessToken = config.tokens.instagram?.token;
  const csvPath = path.join(CSV_DIR, `instagram_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);

  const validMetrics = ['likes', 'comments', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Instagram; defaulting to 'likes'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'likes';
  }

  try {
    let igUserId = isMyAccount ? config.platforms.instagram.INSTAGRAM_BUSINESS_ACCOUNT_ID : account.replace('@', '');
    if (!igUserId) throw new Error('INSTAGRAM_BUSINESS_ACCOUNT_ID not found in config');

    if (!isMyAccount && account.startsWith('@')) {
      log('WARN', 'Public Instagram account lookup by username requires additional permissions; treating as ID');
      if (verbose) log('VERBOSE', 'Assuming input is an Instagram user ID due to API restrictions');
    }

    const posts = [];
    let url = `https://graph.facebook.com/v20.0/${igUserId}/media`;
    const params = {
      access_token: accessToken,
      fields: 'id,timestamp,caption,permalink,like_count,comments_count,media_type,media_url,thumbnail_url',
      limit: 100,
    };

    do {
      if (verbose) log('VERBOSE', `Fetching media from ${url} with params: ${JSON.stringify(params)}`);
      const response = await axios.get(url, { params });
      posts.push(...(response.data.data || []));
      url = response.data.paging?.next;
    } while (url);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.timestamp,
      caption: post.caption || '',
      permalink: post.permalink || '',
      likes: post.like_count || 0,
      comments: post.comments_count || 0,
      media_type: post.media_type || '',
      media_url: post.media_url || post.thumbnail_url || '',
      views: 0, // Not directly available
      engagement: (post.like_count || 0) + (post.comments_count || 0),
    }));

    if (verbose) log('VERBOSE', `Retrieved ${postData.length} posts for ${account}`);
    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Post ID,Created Time,Caption,Permalink,Likes,Comments,Media Type,Media URL,Views,Engagement\n';
    const csvRows = postData.map(post => 
      `"${post.id}","${post.created_time}","${post.caption.replace(/"/g, '""')}","${post.permalink}",${post.likes},${post.comments},"${post.media_type}","${post.media_url}",${post.views},${post.engagement}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `Instagram posts for ${account} sorted by ${metric} saved to ${csvPath}`);
    if (verbose) log('VERBOSE', `CSV written with ${postData.length} rows`);
    return csvPath;
  } catch (error) {
    log('ERROR', `Instagram posts retrieval failed for ${account}: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getInstagramAccountPosts };