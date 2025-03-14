const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { METRICS } = require('../../constants');

async function getYouTubeAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  if (!METRICS.youtube.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for YouTube; defaulting to 'views'`);
    metric = 'views';
  }

  try {
    const url = 'https://www.googleapis.com/youtube/v3/videos';
    const accessToken = config.tokens.youtube.token;
    const posts = await fetchPaginatedData(url, { part: 'snippet,statistics', mine: isMyAccount, forUsername: !isMyAccount ? account : undefined, maxResults: 50 }, accessToken, verbose);

    const postData = posts.map(post => ({
      id: post.id,
      created_time: post.snippet.publishedAt,
      message: `${post.snippet.title || ''} ${post.snippet.description || ''}`.trim(),
      permalink_url: `https://www.youtube.com/watch?v=${post.id}`,
      likes: parseInt(post.statistics.likeCount || 0),
      comments: parseInt(post.statistics.commentCount || 0),
      shares: 0,
      media_type: 'video',
      media_url: post.snippet.thumbnails?.default?.url || '',
      views: parseInt(post.statistics.viewCount || 0),
      engagement: parseInt(post.statistics.likeCount || 0) + parseInt(post.statistics.commentCount || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(post => [post.id, post.created_time, post.message, post.permalink_url, post.likes, post.comments, post.shares, post.media_type, post.media_url, post.views, post.engagement]);
    return await writeCsv(`youtube_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, ['ID', 'Created Time', 'Message', 'Permalink', 'Likes', 'Comments', 'Shares', 'Media Type', 'Media URL', 'Views', 'Engagement'], rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch YouTube posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getYouTubeAccountPosts };