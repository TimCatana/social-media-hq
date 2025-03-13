const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getPinterestToken } = require('../../auth/pinterest');
const { csvHeaderTopPosts, mapTopPostToCsvRow } = require('./config');
const { METRICS } = require('../../constants');

async function getPinterestTopPosts(hashtag, metric, config, verbose = false) {
  const accessToken = await getPinterestToken(config);
  if (!METRICS.pinterest.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Pinterest; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const url = 'https://api.pinterest.com/v5/search/pins';
    const posts = await fetchPaginatedData(url, {
      query: hashtag.replace('#', ''),
      page_size: 100,
    }, accessToken, verbose, {
      headers: { Authorization: `Bearer ${accessToken}` },
      nextKey: 'bookmark',
      dataKey: 'items',
    });

    const topPosts = posts
      .filter(pin => pin.description?.toLowerCase().includes(hashtag.toLowerCase().replace('#', '')))
      .map(pin => ({
        id: pin.id,
        created_time: pin.created_at,
        description: pin.description || '',
        url: pin.link || `https://www.pinterest.com/pin/${pin.id}`,
        likes: pin.save_count || 0,
        comments: pin.comment_count || 0,
        engagement: (pin.save_count || 0) + (pin.comment_count || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = topPosts.map(mapTopPostToCsvRow);
    return await writeCsv(`pinterest_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeaderTopPosts, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Pinterest top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getPinterestTopPosts };