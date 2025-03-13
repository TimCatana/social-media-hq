const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getInstagramToken } = require('../../auth/instagram');
const { csvHeaderTopPosts, mapTopPostToCsvRow } = require('./config');
const { METRICS } = require('../../constants');
const axios = require('axios');

async function getInstagramTopPosts(hashtag, metric, config, verbose = false) {
  const accessToken = await getInstagramToken(config);
  if (!METRICS.instagram.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Instagram; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const userId = config.platforms.instagram.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    const hashtagIdResponse = await axios.get('https://graph.facebook.com/v20.0/ig_hashtag_search', {
      params: { user_id: userId, q: hashtag.replace('#', ''), access_token },
    });
    const hashtagId = hashtagIdResponse.data.data[0]?.id;

    const url = `https://graph.facebook.com/v20.0/${hashtagId}/top_media`;
    const posts = await fetchPaginatedData(url, {
      user_id: userId,
      fields: 'id,timestamp,caption,permalink,like_count,comments_count',
      limit: 50,
    }, accessToken, verbose);

    const topPosts = posts
      .map(post => ({
        id: post.id,
        created_time: post.timestamp,
        caption: post.caption || '',
        url: post.permalink,
        likes: post.like_count || 0,
        comments: post.comments_count || 0,
        engagement: (post.like_count || 0) + (post.comments_count || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = topPosts.map(mapTopPostToCsvRow);
    return await writeCsv(`instagram_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeaderTopPosts, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Instagram top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getInstagramTopPosts };