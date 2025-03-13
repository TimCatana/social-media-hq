const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getPinterestToken } = require('../../auth/pinterest');
const { csvHeader, mapPostToCsvRow, apiFields } = require('./config');
const { METRICS } = require('../../constants');

async function getPinterestAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  const accessToken = await getPinterestToken(config);
  if (!METRICS.pinterest.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for Pinterest; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    const username = account.replace('@', '');
    const url = isMyAccount ? 'https://api.pinterest.com/v5/pins' : `https://api.pinterest.com/v5/users/${username}/pins`;
    const posts = await fetchPaginatedData(url, { fields: apiFields, page_size: 100 }, accessToken, verbose, {
      headers: { Authorization: `Bearer ${accessToken}` },
      nextKey: 'bookmark',
    });

    const postData = posts.map(pin => ({
      id: pin.id,
      created_time: pin.created_at,
      title: pin.title || '',
      description: pin.description || '',
      url: pin.link || '',
      media_type: pin.media?.media_type || '',
      media_url: pin.media?.images?.['1200x']?.url || pin.media?.video_url || '',
      likes: pin.save_count || 0,
      comments: pin.comment_count || 0,
      views: 0,
      engagement: (pin.save_count || 0) + (pin.comment_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(mapPostToCsvRow);
    return await writeCsv(`pinterest_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeader, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch Pinterest posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getPinterestAccountPosts };