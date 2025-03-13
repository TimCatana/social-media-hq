const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getTikTokToken } = require('../../auth/tiktok');
const { csvHeader, mapPostToCsvRow, apiFields } = require('./config');
const { METRICS } = require('../../constants');
const axios = require('axios');

async function getTikTokAccountPosts(account, isMyAccount, metric, config, verbose = false) {
  const accessToken = await getTikTokToken(config);
  if (!METRICS.tiktok.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for TikTok; defaulting to 'likes'`);
    metric = 'likes';
  }

  try {
    if (!isMyAccount) {
      log('WARN', 'TikTok public account posts not supported; limited to authenticated user');
      return await writeCsv(`tiktok_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeader, [], verbose);
    }

    const url = 'https://open.tiktokapis.com/v2/video/list/';
    const posts = await fetchPaginatedData(url, { fields: apiFields, max_count: 100 }, accessToken, verbose, {
      headers: { Authorization: `Bearer ${accessToken}` },
      dataKey: 'data.videos',
      nextKey: 'data.cursor',
      maxItems: 100,
    });

    const postData = posts.map(video => ({
      id: video.id,
      created_time: new Date(video.create_time * 1000).toISOString(),
      title: video.title || '',
      description: video.description || '',
      media_url: video.video_url || '',
      likes: video.stats.digg_count || 0,
      comments: video.stats.comment_count || 0,
      views: video.stats.play_count || 0,
      shares: video.stats.share_count || 0,
      engagement: (video.stats.digg_count || 0) + (video.stats.comment_count || 0) + (video.stats.share_count || 0),
    }));

    postData.sort((a, b) => b[metric] - a[metric]);
    const rows = postData.map(mapPostToCsvRow);
    return await writeCsv(`tiktok_posts_${account.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeader, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch TikTok posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getTikTokAccountPosts };