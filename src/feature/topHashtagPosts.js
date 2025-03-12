const fs = require('fs').promises;
const path = require('path');
const { DateTime } = require('luxon');
const { log } = require('../backend/utils/logUtils');

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
async function getTopPosts(platform, hashtag, metric, config, verbose = false) {
  if (!PLATFORMS[platform]) {
    log('ERROR', `Unsupported platform: ${platform}. Supported: ${Object.keys(PLATFORMS).join(', ')}`);
    throw new Error('Unsupported platform');
  }

  const { getTopPosts, getToken } = PLATFORMS[platform];
  
  log('DEBUG', `Fetching token for ${platform}`);
  const token = await getToken(config);
  if (verbose) log('VERBOSE', `Token fetched for ${platform}: ${token.substring(0, 10)}...`);

  log('DEBUG', `Retrieving top posts for ${platform} with hashtag: ${hashtag}, metric: ${metric}`);
  const posts = await getTopPosts(hashtag, token, metric, verbose);
  if (verbose) log('VERBOSE', `Retrieved ${posts.length} top posts for ${platform}`);

  // Generate CSV file with all post data
  const csvPath = path.join(CSV_DIR, `${platform}_top_posts_${hashtag.replace(/[^a-zA-Z0-9]/g, '_')}_${DateTime.now().toFormat('yyyyMMddHHmmss')}.csv`);
  let csvHeader, csvRows;

  switch (platform) {
    case 'facebook':
      csvHeader = 'Post ID,Created Time,Message,URL,Likes,Comments,Shares,Engagement\n';
      csvRows = posts.map(post => 
        `"${post.id}","${post.created_time || ''}","${(post.message || '').replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.shares},${post.engagement}`
      ).join('\n');
      break;
    case 'instagram':
      csvHeader = 'Post ID,Created Time,Caption,URL,Likes,Comments,Engagement\n';
      csvRows = posts.map(post => 
        `"${post.id}","${post.created_time || ''}","${(post.caption || '').replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.engagement}`
      ).join('\n');
      break;
    case 'pinterest':
      csvHeader = 'Pin ID,Created Time,Description,URL,Likes,Comments,Engagement\n';
      csvRows = posts.map(post => 
        `"${post.id}","${post.created_time || ''}","${(post.description || '').replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.engagement}`
      ).join('\n');
      break;
    case 'tiktok':
      csvHeader = 'Video ID,Created Time,Description,URL,Likes,Comments,Views,Shares,Engagement\n';
      csvRows = posts.map(post => 
        `"${post.id}","${post.created_time || ''}","${(post.description || '').replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.views},${post.shares},${post.engagement}`
      ).join('\n');
      break;
    case 'threads':
      csvHeader = 'Post ID,Created Time,Text,URL,Likes,Comments,Engagement\n';
      csvRows = posts.map(post => 
        `"${post.id}","${post.created_time || ''}","${(post.text || '').replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.engagement}`
      ).join('\n');
      break;
    case 'youtube':
      csvHeader = 'Video ID,Created Time,Title,URL,Likes,Comments,Views,Engagement\n';
      csvRows = posts.map(post => 
        `"${post.id}","${post.created_time || ''}","${(post.title || '').replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.views},${post.engagement}`
      ).join('\n');
      break;
    case 'rumble':
      csvHeader = 'Video ID,Created Time,Title,URL,Likes,Comments,Views,Engagement\n';
      csvRows = posts.map(post => 
        `"${post.id}","${post.created_time || ''}","${(post.title || '').replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.views},${post.engagement}`
      ).join('\n');
      break;
    case 'x':
      csvHeader = 'Tweet ID,Created Time,Text,URL,Likes,Comments,Views,Retweets,Engagement\n';
      csvRows = posts.map(post => 
        `"${post.id}","${post.created_time || ''}","${(post.text || '').replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.views},${post.retweets},${post.engagement}`
      ).join('\n');
      break;
    default:
      throw new Error(`No CSV format defined for ${platform}`);
  }

  await fs.writeFile(csvPath, csvHeader + csvRows);
  if (verbose) log('VERBOSE', `CSV written to ${csvPath} with ${posts.length} rows`);

  log('INFO', `Top posts for ${platform} saved to ${csvPath}`);
  return csvPath;
}

module.exports = { getTopPosts, COMMON_METRICS };