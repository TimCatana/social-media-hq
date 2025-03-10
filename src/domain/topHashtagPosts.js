const fs = require('fs').promises;
const path = require('path');
const { DateTime } = require('luxon');
const { log } = require('../backend/logging/logUtils'); // Centralized logging

// Import platform-specific top posts functions
const { getFacebookTopPosts } = require('../backend/hashtag-posts/getFacebookTopPosts');
const { getInstagramTopPosts } = require('../backend/hashtag-posts/getInstagramTopPosts');
const { getPinterestTopPosts } = require('../backend/hashtag-posts/getPinterestTopPosts');
const { getTikTokTopPosts } = require('../backend/hashtag-posts/getTikTokTopPosts');
const { getThreadsTopPosts } = require('../backend/hashtag-posts/getThreadsTopPosts');
const { getYouTubeTopPosts } = require('../backend/hashtag-posts/getYouTubeTopPosts');
const { getRumbleTopPosts } = require('../backend/hashtag-posts/getRumbleTopPosts');
const { getTwitterTopPosts } = require('../backend/hashtag-posts/getTwitterTopPosts');

const CSV_DIR = path.join(__dirname, '..', '..', 'bin', 'csv');

// Define supported platforms and their associated functions and auth tokens
const PLATFORMS = {
  facebook: { getTopPosts: getFacebookTopPosts, getToken: require('../backend/auth/facebookAuth').getFacebookToken },
  instagram: { getTopPosts: getInstagramTopPosts, getToken: require('../backend/auth/instagramThreadsAuth').getInstagramThreadsToken },
  pinterest: { getTopPosts: getPinterestTopPosts, getToken: require('../backend/auth/pinterestAuth').getPinterestToken },
  tiktok: { getTopPosts: getTikTokTopPosts, getToken: require('../backend/auth/tiktokAuth').getTikTokToken },
  threads: { getTopPosts: getThreadsTopPosts, getToken: require('../backend/auth/instagramThreadsAuth').getInstagramThreadsToken },
  youtube: { getTopPosts: getYouTubeTopPosts, getToken: require('../backend/auth/youtubeAuth').getYouTubeToken },
  rumble: { getTopPosts: getRumbleTopPosts, getToken: require('../backend/auth/rumbleAuth').getRumbleToken },
  x: { getTopPosts: getTwitterTopPosts, getToken: require('../backend/auth/twitterAuth').getTwitterToken },
};

// Common sorting metrics (platforms may support additional ones)
const COMMON_METRICS = ['likes', 'comments', 'views', 'engagement'];

// Main function to get top posts
async function getTopPosts(platform, hashtag, metric, config) {
  if (!PLATFORMS[platform]) {
    log('ERROR', `Unsupported platform: ${platform}. Supported: ${Object.keys(PLATFORMS).join(', ')}`);
    throw new Error('Unsupported platform');
  }

  const { getTopPosts, getToken } = PLATFORMS[platform];
  const token = await getToken(config);
  const posts = await getTopPosts(hashtag, token, metric);

  // Generate CSV file
  const csvPath = path.join(CSV_DIR, `${platform}_top_posts_${hashtag.replace('#', '')}_${DateTime.now().toFormat('yyyyMMddHHmmss')}.csv`);
  const csvHeader = 'Post ID,URL,Metric Value\n';
  const csvRows = posts.map(post => `${post.id},${post.url},${post[metric] || 'N/A'}`).join('\n');
  await fs.writeFile(csvPath, csvHeader + csvRows);

  log('INFO', `Top posts for ${platform} saved to ${csvPath}`);
  return csvPath;
}

module.exports = { getTopPosts, COMMON_METRICS };