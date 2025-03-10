// ./domain/scheduler.js
const fs = require('fs').promises;
const path = require('path');
const { parse } = require('csv-parse');
const { DateTime } = require('luxon');
const dotenv = require('dotenv');
const { loadConfig, saveConfig } = require('../backend/auth/authUtils');
const { postToInstagram } = require('../backend/upload/uploadToInstagram');
const { postToFacebook } = require('../backend/upload/uploadToFacebook');
const { postToPinterest } = require('../backend/upload/uploadToPinterest');
const { postToTikTok } = require('../backend/upload/uploadToTikTok');
const { postToTwitter } = require('../backend/upload/uploadToTwitter');
const { postToYouTube } = require('../backend/upload/uploadToYouTube');
const { postToRumble } = require('../backend/upload/uploadToRumble');
const { postToThreads } = require('../backend/upload/uploadToThreads');
const { getInstagramThreadsToken } = require('../backend/auth/instagramThreadsAuth');
const { getFacebookToken } = require('../backend/auth/facebookAuth');
const { getPinterestToken } = require('../backend/auth/pinterestAuth');
const { getTikTokToken } = require('../backend/auth/tiktokAuth');
const { getTwitterToken } = require('../backend/auth/twitterAuth');
const { getYouTubeToken } = require('../backend/auth/youtubeAuth');
const { getRumbleToken } = require('../backend/auth/rumbleAuth');
const { log } = require('../backend/logging/logUtils');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const BIN_DIR = path.join(__dirname, '..', '..', 'bin');
const CSV_DIR = path.join(BIN_DIR, 'csv');
const SH_DIR = path.join(BIN_DIR, 'sh');

async function ensureDirs(dirs) {
  await Promise.all(dirs.map(dir => fs.mkdir(dir, { recursive: true }).catch(err => {
    log('ERROR', `Failed to create directory ${dir}: ${err.message}`);
    throw err;
  })));
}

function createLogger(platform) {
  const logFileName = `scheduler-${platform}-${DateTime.now().setZone('America/New_York').toFormat('yyyyMMdd-HHmmss')}.log`;
  const logFilePath = path.join(LOG_DIR, logFileName);
  const logStream = require('fs').createWriteStream(logFilePath, { flags: 'a' });

  return (level, message) => {
    const timestamp = DateTime.now().setZone('America/New_York').toISO();
    const logMessage = `${timestamp} [${level}] ${message}`;
    if (!logStream.writableEnded) logStream.write(`${logMessage}\n`);
    log(level, logMessage);
  };
}

async function parseCsv(filePath, expectedHeaders) {
  const posts = [];
  const stream = require('fs').createReadStream(filePath).pipe(parse({ columns: true, trim: true }));

  for await (const row of stream) {
    const missingHeaders = expectedHeaders.filter(header => !(header in row));
    if (missingHeaders.length > 0) {
      throw new Error(`CSV missing required headers: ${missingHeaders.join(', ')}`);
    }

    const originalTime = DateTime.fromFormat(row['Publish Date'], "yyyy-MM-dd'T'HH:mm:ss");
    if (!originalTime.isValid) {
      log('ERROR', `Invalid date in row: ${JSON.stringify(row)}`);
      continue;
    }

    posts.push({
      originalTime: originalTime.toJSDate(),
      time: originalTime.toJSDate(),
      imageUrl: row['Media URL']?.trim() || '',
      caption: row['Caption']?.trim() || '',
      hashtags: row['Hashtags']?.trim() || '',
      location: row['Location']?.trim() || '',
      title: row['Title']?.trim() || '',
      boardId: row['Board ID']?.trim() || '',
      link: row['External Link']?.trim() || '',
      altText: row['Alt Text']?.trim() || '',
      duration: parseInt(row['Duration (seconds)']) || 0,
    });
  }

  return posts;
}

async function schedulePosts(postsToSchedule, uploadFunction, platformLog) {
  postsToSchedule.forEach(post => {
    const timeDiff = post.time - new Date();
    if (timeDiff > 0) {
      platformLog('INFO', `Scheduling ${post.platform} post for ${post.time.toISOString()} (originally ${post.originalTime.toISOString()})`);
      setTimeout(() => uploadFunction(post), timeDiff); // Multiple posts at same time are handled concurrently
    } else {
      platformLog('WARN', `Post for ${post.platform} at ${post.time.toISOString()} is in the past; should have been rescheduled`);
    }
  });
}

async function schedulePlatformPosts(platform, csvFilePath, config, getToken, uploadFunction, csvFormat) {
  const platformLog = createLogger(platform);
  await ensureDirs([LOG_DIR, BIN_DIR, CSV_DIR, SH_DIR]);

  const csvBaseName = path.basename(csvFilePath, '.csv').replace(/[^a-zA-Z0-9]/g, '_');
  const UPLOADED_LOG = path.join(LOG_DIR, `uploaded-${csvBaseName}.log`);
  const UPLOAD_HISTORY = path.join(CSV_DIR, `${csvBaseName}_upload_history.csv`);

  try {
    await fs.access(csvFilePath);
  } catch (err) {
    log('ERROR', `CSV file not found: ${csvFilePath}`);
    platformLog('ERROR', `CSV file not found: ${csvFilePath}`);
    throw new Error('CSV file not found');
  }

  const token = await getToken(config);
  if (!token) {
    log('ERROR', `No valid token for ${platform}`);
    platformLog('ERROR', `No valid token for ${platform}`);
    throw new Error('Authentication failed');
  }

  let uploadedPosts = new Set();
  try {
    const data = await fs.readFile(UPLOADED_LOG, 'utf8');
    uploadedPosts = new Set(data.split('\n').filter(line => line.trim()));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const expectedHeaders = csvFormat.split(',').map(h => h.trim());
  const posts = await parseCsv(csvFilePath, expectedHeaders);
  posts.forEach(post => {
    post.platform = platform;
    post.accessToken = token;
    post.uploadHistoryPath = UPLOAD_HISTORY;
    post.uploadedLogPath = UPLOADED_LOG;
  });

  // Validate platform-specific fields
  posts.forEach(post => {
    if (platform !== 'pinterest' && (post.title || post.boardId || post.link || post.altText)) {
      platformLog('WARN', `Ignoring Pinterest-specific fields for ${platform}: ${JSON.stringify(post)}`);
      post.title = post.boardId = post.link = post.altText = '';
    }
    if (platform === 'pinterest' && !post.boardId) {
      throw new Error(`Board ID required for Pinterest post: ${JSON.stringify(post)}`);
    }
    if ((platform === 'youtube' || platform === 'rumble' || platform === 'tiktok') && !/\.(mp4|mov)$/i.test(post.imageUrl)) {
      throw new Error(`${platform} requires video URL (.mp4, .mov): ${post.imageUrl}`);
    }
  });

  platformLog('INFO', `Loaded ${posts.length} posts from ${csvFilePath}`);
  const now = DateTime.now().setZone('America/New_York');
  const futurePosts = posts.filter(p => DateTime.fromJSDate(p.originalTime) > now && !uploadedPosts.has(p.originalTime.toISOString()));
  const missedPosts = posts.filter(p => DateTime.fromJSDate(p.originalTime) <= now && !uploadedPosts.has(p.originalTime.toISOString()));

  platformLog('INFO', `Found ${futurePosts.length} future posts and ${missedPosts.length} missed posts`);

  // Schedule future posts
  await schedulePosts(futurePosts, uploadFunction, platformLog);

  // Reschedule missed posts based on last scheduled date in CSV + days missed
  if (missedPosts.length > 0) {
    const lastScheduledDate = posts.length > 0 
      ? DateTime.fromJSDate(posts.reduce((max, p) => p.originalTime > max ? p.originalTime : max, posts[0].originalTime)).startOf('day')
      : now.startOf('day');
    
    missedPosts.forEach(post => {
      const original = DateTime.fromJSDate(post.originalTime);
      const daysMissed = Math.max(0, Math.floor(now.diff(original, 'days').days));
      const newTime = lastScheduledDate.plus({ days: daysMissed + 1 }).set({
        hour: original.hour,
        minute: original.minute,
        second: original.second,
      });
      post.time = newTime.toJSDate();
      platformLog('INFO', `Rescheduling missed ${platform} post from ${post.originalTime.toISOString()} to ${post.time.toISOString()} (last CSV date: ${lastScheduledDate.toISODate()})`);
    });
    await schedulePosts(missedPosts, uploadFunction, platformLog);
  }

  platformLog('INFO', `All ${platform} posts scheduled. Keep this process running for future posts.`);
  await saveConfig(config);
}

async function scheduleFacebookPosts(csvFilePath, config) {
  await schedulePlatformPosts('facebook', csvFilePath, config, getFacebookToken, postToFacebook, 'Publish Date,Media URL,Caption,Hashtags,Location');
}

async function scheduleInstagramPosts(csvFilePath, config) {
  await schedulePlatformPosts('instagram', csvFilePath, config, getInstagramThreadsToken, postToInstagram, 'Publish Date,Media URL,Caption,Hashtags,Location');
}

async function schedulePinterestPosts(csvFilePath, config) {
  await schedulePlatformPosts('pinterest', csvFilePath, config, getPinterestToken, postToPinterest, 'Publish Date,Media URL,Caption,Hashtags,Location,Title,Board ID,External Link,Alt Text');
}

async function scheduleTikTokPosts(csvFilePath, config) {
  await schedulePlatformPosts('tiktok', csvFilePath, config, getTikTokToken, postToTikTok, 'Publish Date,Media URL,Caption,Hashtags');
}

async function scheduleThreadsPosts(csvFilePath, config) {
  await schedulePlatformPosts('threads', csvFilePath, config, getInstagramThreadsToken, postToThreads, 'Publish Date,Media URL,Caption,Hashtags,Location');
}

async function scheduleYouTubePosts(csvFilePath, config) {
  await schedulePlatformPosts('youtube', csvFilePath, config, getYouTubeToken, postToYouTube, 'Publish Date,Media URL,Caption,Hashtags,Location,Duration (seconds)');
}

async function scheduleRumblePosts(csvFilePath, config) {
  await schedulePlatformPosts('rumble', csvFilePath, config, getRumbleToken, postToRumble, 'Publish Date,Media URL,Caption,Hashtags,Location,Duration (seconds)');
}

async function scheduleTwitterPosts(csvFilePath, config) {
  await schedulePlatformPosts('x', csvFilePath, config, getTwitterToken, postToTwitter, 'Publish Date,Media URL,Caption,Hashtags,Location');
}

module.exports = {
  scheduleFacebookPosts,
  scheduleInstagramPosts,
  schedulePinterestPosts,
  scheduleTikTokPosts,
  scheduleThreadsPosts,
  scheduleYouTubePosts,
  scheduleRumblePosts,
  scheduleTwitterPosts,
};