const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getThreadsToken } = require('../../auth/instagram');
const { csvHeaderTopPosts, mapTopPostToCsvRow } = require('./config');
const { METRICS } = require('../../constants');

async function getThreadsTopPosts(hashtag, metric, config, verbose = false) {
  const accessToken = await getThreadsToken(config);
  if (!METRICS.threads.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Threads; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const userId = config.platforms.threads.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    const url = `https://graph.threads.net/v1.0/${userId}/threads`;
    const posts = await fetchPaginatedData(url, {
      fields: 'id,created_time,text,permalink,like_count,comments_count',
      limit: 100,
    }, accessToken, verbose);

    const topPosts = posts
      .filter(post => post.text?.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')))
      .map(post => ({
        id: post.id,
        created_time: post.created_time,
        text: post.text || '',
        url: post.permalink,
        likes: post.like_count || 0,
        comments: post.comments_count || 0,
        engagement: (post.like_count || 0) + (post.comments_count || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = topPosts.map(mapTopPostToCsvRow);
    return await writeCsv(`threads_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeaderTopPosts, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Threads top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getThreadsTopPosts };