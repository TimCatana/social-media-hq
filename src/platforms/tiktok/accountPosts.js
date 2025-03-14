const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { METRICS } = require('../../constants');

async function getTikTokAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  if (!METRICS.tiktok.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for TikTok; defaulting to 'views'`);
    metric = 'views';
  }

  try {
    const url = 'https://open.tiktokapis.com/v2/video/list/';
    const accessToken = config.tokens.tiktok.token;
    const posts = await fetchPaginatedData(url, { fields: 'id,create_time,title,video_description,like_count,comment_count,share_count,view_count', limit: 100 }, accessToken, verbose);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.create_time,
      message: `${post.title || ''} ${post.video_description || ''}`.trim(),
      permalink_url: `https://www.tiktok.com/video/${post.id}`,
      likes: post.like_count || 0,
      comments: post.comment_count || 0,
      shares: post.share_count || 0,
      media_type: 'video',
      media_url: '',
      views: post.view_count || 0,
      engagement: (post.like_count || 0) + (post.comment_count || 0) + (post.share_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(post => [post.id, post.created_time, post.message, post.permalink_url, post.likes, post.comments, post.shares, post.media_type, post.media_url, post.views, post.engagement]);
    return await writeCsv(`tiktok_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, ['ID', 'Created Time', 'Message', 'Permalink', 'Likes', 'Comments', 'Shares', 'Media Type', 'Media URL', 'Views', 'Engagement'], rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch TikTok posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getTikTokAccountPosts };