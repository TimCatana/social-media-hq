const { fetchPaginatedData } = require('../../utils/apiUtils');
const { writeCsv } = require('../../utils/csvUtils');
const { log } = require('../../utils/logUtils');
const { getTikTokToken } = require('../../auth/tiktok');
const { csvHeaderTopPosts, mapTopPostToCsvRow } = require('./config');
const { METRICS } = require('../../constants');
const axios = require('axios');

async function getTikTokTopPosts(hashtag, metric, config, verbose = false) {
  const accessToken = await getTikTokToken(config);
  if (!METRICS.tiktok.includes(metric)) {
    log('WARN', `Invalid metric '${metric}' for TikTok; defaulting to 'engagement'`);
    metric = 'engagement';
  }

  try {
    const url = 'https://open.tiktokapis.com/v2/video/query/';
    const posts = await fetchPaginatedData(url, {
      filters: { hashtag_names: [hashtag.replace('#', '')] },
      max_count: 100,
      fields: 'id,create_time,description,video_url,stats{play_count,comment_count,digg_count,share_count}',
    }, accessToken, verbose, {
      headers: { Authorization: `Bearer ${accessToken}` },
      dataKey: 'data.videos',
      nextKey: 'data.cursor',
    });

    const topPosts = posts
      .map(video => ({
        id: video.id,
        created_time: new Date(video.create_time * 1000).toISOString(),
        description: video.description || '',
        url: video.video_url || `https://www.tiktok.com/video/${video.id}`,
        likes: video.stats.digg_count || 0,
        comments: video.stats.comment_count || 0,
        views: video.stats.play_count || 0,
        shares: video.stats.share_count || 0,
        engagement: (video.stats.digg_count || 0) + (video.stats.comment_count || 0) + (video.stats.share_count || 0),
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10);

    const rows = topPosts.map(mapTopPostToCsvRow);
    return await writeCsv(`tiktok_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}`, csvHeaderTopPosts, rows, verbose);
  } catch (error) {
    log('ERROR', `Failed to fetch TikTok top posts: ${error.message}`);
    throw error;
  }
}

module.exports = { getTikTokTopPosts };