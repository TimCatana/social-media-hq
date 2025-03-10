const fs = require('fs').promises;
const path = require('path');
const { DateTime } = require('luxon');
const { loadConfig, saveConfig } = require('../backend/auth/authUtils');
const { log } = require('../backend/logging/logUtils'); // Updated import from logUtils

// Import auth modules (matching main.js naming)
const { getFacebookToken } = require('../backend/auth/facebookAuth');
const { getInstagramThreadsToken } = require('../backend/auth/instagramThreadsAuth');
const { getPinterestToken } = require('../backend/auth/pinterestAuth');
const { getTikTokToken } = require('../backend/auth/tiktokAuth');
const { getTwitterToken } = require('../backend/auth/twitterAuth');

// Import hashtag functions
const { getTwitterHashtags } = require('../backend/hashtag/getTwitterHashtags');
const { getInstagramHashtags } = require('../backend/hashtag/getInstagramHashtags');
const { getFacebookHashtags } = require('../backend/hashtag/getFacebookHashtags');
const { getThreadsHashtags } = require('../backend/hashtag/getThreadsHashtags');
const { getPinterestHashtags } = require('../backend/hashtag/getPinterestHashtags');
const { getTikTokHashtags } = require('../backend/hashtag/getTikTokHashtags');

const CSV_DIR = path.join(__dirname, '..', '..', 'bin', 'csv');

// Platform definitions with hashtag functions and token retrieval
const PLATFORMS = {
  facebook: { getHashtags: getFacebookHashtags, getToken: getFacebookToken },
  instagram: { getHashtags: getInstagramHashtags, getToken: getInstagramThreadsToken },
  pinterest: { getHashtags: getPinterestHashtags, getToken: getPinterestToken },
  tiktok: { getHashtags: getTikTokHashtags, getToken: getTikTokToken },
  threads: { getHashtags: getThreadsHashtags, getToken: getInstagramThreadsToken },
  x: { getHashtags: getTwitterHashtags, getToken: getTwitterToken },
};

// Format frequency into K/M notation
function formatFrequency(frequency) {
  if (frequency >= 1000000) return `${(frequency / 1000000).toFixed(1)}M`;
  if (frequency >= 1000) return `${(frequency / 1000).toFixed(1)}K`;
  return frequency.toString();
}

async function gatherHashtags(platform, seedKeyword, sortBy, config) {
  if (!PLATFORMS[platform]) {
    log('ERROR', `Unsupported platform: ${platform}. Supported: ${Object.keys(PLATFORMS).join(', ')}`);
    throw new Error('Unsupported platform');
  }

  const { getHashtags, getToken } = PLATFORMS[platform];
  const token = await getToken(config);
  const hashtags = await getHashtags(seedKeyword, token);

  // Sort hashtags based on user choice
  switch (sortBy) {
    case 'frequency':
      hashtags.sort((a, b) => b.frequency - a.frequency); // Highest traffic
      break;
    case 'alphabetical':
      hashtags.sort((a, b) => a.hashtag.localeCompare(b.hashtag)); // Alphabetical
      break;
    default:
      log('WARN', `Unknown sort option '${sortBy}', defaulting to frequency`);
      hashtags.sort((a, b) => b.frequency - a.frequency);
  }

  // Write to CSV
  const csvPath = path.join(CSV_DIR, `${platform}_hashtags_${seedKeyword}_${DateTime.now().toFormat('yyyyMMddHHmmss')}.csv`);
  const csvHeader = 'Hashtag,Frequency\n';
  const csvRows = hashtags.map(h => `${h.hashtag},${formatFrequency(h.frequency)}`).join('\n');
  await fs.writeFile(csvPath, csvHeader + csvRows);

  log('INFO', `Hashtags for ${platform} saved to ${csvPath}`);
  return csvPath;
}

module.exports = { gatherHashtags };