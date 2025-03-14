const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { METRICS } = require('../../constants');

async function getTikTokTopPosts(hashtag, metric, config, verbose = false) {
  if (!METRICS.tiktok.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for TikTok; defaulting to 'views'`);
    metric = 'views';
  }

  try {
    const url = 'https://open.tiktokapis.com/v2/video/query/';
    const accessToken = config.tokens.tiktok.token;
    const posts = await fetchPaginatedData(url, { query: `hashtag=${hashtag}`, fields: 'id,create_time,title,video_description,like_count,comment_count,share_count,view_count', limit: 100 }, accessToken, verbose);

    const filteredPosts = posts
      .filter(post => post.video_description?.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')))
      .map(post => ({
        id: post.id,
        created_time: post.create_time,
        message: `${post.title || ''} ${post.video_description || ''}`.trim(),
        url: `https://www.tiktok.com/video/${post.id}`,
        likes: post.like_count || 0,
        comments: post.comment_count || 0,
        shares: post.share_count || 0,
        engagement: (post.like_count || 0) + (post.comment_count || 0) + (post.share_count || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = filteredPosts.map(post => [post.id, post.created_time, post.message, post.url, post.likes, post.comments, post.shares, post.engagement]);
    return await writeCsv(`tiktok_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, ['ID', 'Created Time', 'Message', 'URL', 'Likes', 'Comments', 'Shares', 'Engagement'], rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch TikTok top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getTikTokTopPosts };