const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { METRICS } = require('../../constants');

async function getYouTubeTopPosts(hashtag, metric, config, verbose = false) {
  if (!METRICS.youtube.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for YouTube; defaulting to 'views'`);
    metric = 'views';
  }

  try {
    const url = 'https://www.googleapis.com/youtube/v3/search';
    const accessToken = config.tokens.youtube.token;
    const posts = await fetchPaginatedData(url, { part: 'snippet', q: hashtag, type: 'video', maxResults: 50 }, accessToken, verbose);

    const videoIds = posts.map(post => post.id.videoId).join(',');
    const statsUrl = 'https://www.googleapis.com/youtube/v3/videos';
    const detailedPosts = await fetchPaginatedData(statsUrl, { part: 'snippet,statistics', id: videoIds }, accessToken, verbose);

    const filteredPosts = detailedPosts
      .filter(post => post.snippet.description?.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')))
      .map(post => ({
        id: post.id,
        created_time: post.snippet.publishedAt,
        message: `${post.snippet.title || ''} ${post.snippet.description || ''}`.trim(),
        url: `https://www.youtube.com/watch?v=${post.id}`,
        likes: parseInt(post.statistics.likeCount || 0),
        comments: parseInt(post.statistics.commentCount || 0),
        shares: 0,
        engagement: parseInt(post.statistics.likeCount || 0) + parseInt(post.statistics.commentCount || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = filteredPosts.map(post => [post.id, post.created_time, post.message, post.url, post.likes, post.comments, post.shares, post.engagement]);
    return await writeCsv(`youtube_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, ['ID', 'Created Time', 'Message', 'URL', 'Likes', 'Comments', 'Shares', 'Engagement'], rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch YouTube top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getYouTubeTopPosts };