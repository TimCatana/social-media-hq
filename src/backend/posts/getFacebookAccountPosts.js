const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { log } = require('../utils/logUtils');

const CSV_DIR = path.join(__dirname, '..', '..', '..', 'bin', 'csv');

async function getFacebookAccountPosts(account, isMyAccount, metric = 'likes', config, verbose = false) {
  const accessToken = config.tokens.facebook?.token;
  const csvPath = path.join(CSV_DIR, `facebook_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);

  const validMetrics = ['likes', 'comments', 'shares', 'engagement'];
  if (!validMetrics.includes(metric)) {
    log('WARN', `Unsupported metric '${metric}' for Facebook; defaulting to 'likes'`);
    if (verbose) log('VERBOSE', `Metric validation: ${metric} not in ${validMetrics.join(', ')}`);
    metric = 'likes';
  }

  try {
    let pageId = isMyAccount ? config.platforms.facebook.PAGE_ID : account.replace('@', '');
    if (!pageId) throw new Error('PAGE_ID not found in config for my account');

    if (!isMyAccount && account.startsWith('@')) {
      if (verbose) log('VERBOSE', `Resolving Facebook page ID for ${account}`);
      const searchResponse = await axios.get('https://graph.facebook.com/v20.0/pages/search', {
        params: {
          q: account.replace('@', ''),
          access_token: accessToken,
          fields: 'id,name',
        },
      });
      pageId = searchResponse.data.data[0]?.id;
      if (!pageId) throw new Error(`Could not resolve Facebook page ID for ${account}`);
      if (verbose) log('VERBOSE', `Resolved page ID: ${pageId}`);
    }

    const posts = [];
    let url = `https://graph.facebook.com/v20.0/${pageId}/posts`;
    const params = {
      access_token: accessToken,
      fields: 'id,created_time,message,permalink_url,reactions.summary(total_count),comments.summary(total_count),shares,attachments{media_type,url,subattachments}',
      limit: 100,
    };

    do {
      if (verbose) log('VERBOSE', `Fetching posts from ${url} with params: ${JSON.stringify(params)}`);
      const response = await axios.get(url, { params });
      posts.push(...(response.data.data || []));
      url = response.data.paging?.next;
    } while (url);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.created_time,
      message: post.message || '',
      permalink_url: post.permalink_url || '',
      likes: post.reactions?.summary.total_count || 0,
      comments: post.comments?.summary.total_count || 0,
      shares: post.shares?.count || 0,
      media_type: post.attachments?.data[0]?.media_type || '',
      media_url: post.attachments?.data[0]?.url || (post.attachments?.data[0]?.subattachments?.data[0]?.url || ''),
      views: 0, // Not available via Graph API for posts
      engagement: (post.reactions?.summary.total_count || 0) + (post.comments?.summary.total_count || 0) + (post.shares?.count || 0),
    }));

    if (verbose) log('VERBOSE', `Retrieved ${postData.length} posts for ${account}`);
    postData.sort((a, b) => b[metric] - a[metric]);

    const csvHeader = 'Post ID,Created Time,Message,Permalink URL,Likes,Comments,Shares,Media Type,Media URL,Views,Engagement\n';
    const csvRows = postData.map(post => 
      `"${post.id}","${post.created_time}","${post.message.replace(/"/g, '""')}","${post.permalink_url}",${post.likes},${post.comments},${post.shares},"${post.media_type}","${post.media_url}",${post.views},${post.engagement}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    log('INFO', `Facebook posts for ${account} sorted by ${metric} saved to ${csvPath}`);
    if (verbose) log('VERBOSE', `CSV written with ${postData.length} rows`);
    return csvPath;
  } catch (error) {
    log('ERROR', `Facebook posts retrieval failed for ${account}: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    if (verbose) log('VERBOSE', `Error details: ${error.stack}`);
    throw error;
  }
}

module.exports = { getFacebookAccountPosts };