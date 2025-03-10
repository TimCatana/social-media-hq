#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const dotenv = require('dotenv');
const { DateTime } = require('luxon');
const { loadConfig, saveConfig } = require('./auth/authUtils');

// Import upload functions from ./uploads/
const { postToInstagram } = require('./upload/uploadToInstagram');
const { postToFacebook } = require('./upload/uploadToFacebook');
const { postToPinterest } = require('./upload/uploadToPinterest');
const { postToTikTok } = require('./upload/uploadToTikTok');
const { postToTwitter } = require('./upload/uploadToTwitter');
const { postToYouTube } = require('./upload/uploadToYoutube');
const { postToRumble } = require('./upload/uploadToRumble');
const { postToThreads } = require('./upload/uploadToThreads');

// Import auth modules by token group
const { getInstagramToken } = require('./auth/instagramAuth');
const { getFacebookToken } = require('./auth/facebookAuth');
const { getPinterestToken } = require('./auth/pinterestAuth');
const { getTikTokToken } = require('./auth/tiktokAuth');
const { getTwitterToken } = require('./auth/twitterAuth');
const { getYouTubeToken } = require('./auth/youtubeAuth');
const { getRumbleToken } = require('./auth/rumbleAuth');

// Load environment variables from .env (relative to project root)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configuration
const LOG_DIR = path.join(__dirname, '..', 'logs');
const BIN_DIR = path.join(__dirname, '..', 'bin');
const CSV_DIR = path.join(BIN_DIR, 'csv');
const SH_DIR = path.join(BIN_DIR, 'sh');
const VERBOSE = process.argv.includes('-v');
const SCRIPT_NAME = path.basename(__filename, '.js');

// Token group to auth function mapping with config
let config = null;
async function initializeConfig() {
  if (!config) {
    config = await loadConfig();
  }
}

const TOKEN_GROUPS = {
  Instagram: async () => await getInstagramToken(config),
  Facebook: async () => await getFacebookToken(config),
  Pinterest: async () => await getPinterestToken(config),
  TikTok: async () => await getTikTokToken(config),
  Twitter: getTwitterToken,
  YouTube: getYouTubeToken,
  Rumble: getRumbleToken,
  Threads: async () => await getInstagramToken(config),
};

// Platform definitions with token groups
const PLATFORMS = {
  Instagram: { uploadFunction: postToInstagram, tokenGroup: 'Instagram' },
  Facebook: { uploadFunction: postToFacebook, tokenGroup: 'Facebook' },
  Pinterest: { uploadFunction: postToPinterest, tokenGroup: 'Pinterest' },
  TikTok: { uploadFunction: postToTikTok, tokenGroup: 'TikTok' },
  Twitter: { uploadFunction: postToTwitter, tokenGroup: 'Twitter' },
  YouTube: { uploadFunction: postToYouTube, tokenGroup: 'YouTube' },
  Rumble: { uploadFunction: postToRumble, tokenGroup: 'Rumble' },
  Threads: { uploadFunction: postToThreads, tokenGroup: 'Threads' },
};

// Ensure directories exist
async function ensureDirs(dirs) {
  await Promise.all(dirs.map(dir => fs.mkdir(dir, { recursive: true }).catch(err => {
    console.error(`Failed to create directory ${dir}: ${err.message}`);
    process.exit(1);
  })));
}

// Console logging setup with unique file per execution
const consoleLogFileName = `${SCRIPT_NAME}-${DateTime.now().setZone('America/New_York').toFormat('yyyy-MM-dd-HH-mm-ss')}.log`;
const consoleLogPath = path.join(LOG_DIR, consoleLogFileName);
const consoleLogStream = require('fs').createWriteStream(consoleLogPath, { flags: 'a' });

const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

function setupConsoleLogging() {
  const logToFile = (level, ...args) => {
    const timestamp = DateTime.now().setZone('America/New_York').toISO();
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    consoleLogStream.write(`${timestamp} [${level.toUpperCase()}] ${message}\n`);
  };

  console.log = (...args) => {
    originalConsole.log(...args);
    logToFile('info', ...args);
  };
  console.error = (...args) => {
    originalConsole.error(...args);
    logToFile('error', ...args);
  };
  console.warn = (...args) => {
    originalConsole.warn(...args);
    logToFile('warn', ...args);
  };
  console.info = (...args) => {
    originalConsole.info(...args);
    logToFile('info', ...args);
  };

  process.on('exit', () => consoleLogStream.end());
}

// Scheduler-specific logging
const logFileName = `scheduler-${DateTime.now().setZone('America/New_York').toFormat('yyyy-MM-dd-HH-mm-ss')}.log`;
const logFilePath = path.join(LOG_DIR, logFileName);
const logStream = require('fs').createWriteStream(logFilePath, { flags: 'a' });

const log = (level, message) => {
  const timestamp = DateTime.now().setZone('America/New_York').toISO();
  const logMessage = `${timestamp} [${level}] ${message}`;
  if (!logStream.writableEnded) logStream.write(`${logMessage}\n`);
  if (level === 'ERROR' || VERBOSE || level === 'WARN') originalConsole[level.toLowerCase()](logMessage);
};

// Help message
function displayHelp() {
  const helpText = `
uploadScheduler.js - Schedule social media posts from a CSV file for multiple platforms.

Usage:
  node src/uploadScheduler.js <csvFilePath> [-v] [--help | -help]

CSV Format (comma-separated):
  "Platform","Publish Date","Media URL","Caption","Hashtags","Location","Title (Pinterest)","Board ID (Pinterest)","External Link (Pinterest)","Alt Text (Pinterest)"
  
Platform: Required, must be "Instagram", "Facebook", "Pinterest", "TikTok", "Twitter", "YouTube", "Rumble", or "Threads" (case-sensitive, extensible)
Publish Date: yyyy-mm-ddThh:mm:ss (e.g., 2025-03-09T09:00:00), required
Media URL: Valid URL (http/https), required
Caption: Text, required
Hashtags: Space-separated, optional
Location: Text, optional (used where supported)
Title (Pinterest): Text, optional for Pinterest, empty otherwise
Board ID (Pinterest): Text, required for Pinterest, empty otherwise
External Link (Pinterest): URL, optional for Pinterest, empty otherwise
Alt Text (Pinterest): Text, optional for Pinterest, empty otherwise

Requirements:
  - Set credentials in .env for each platform (see platform-specific auth files)
  - Missed posts are appended to the next day after the last scheduled post

Flags:
  -v            Verbose output
  -help, --help Display this help and exit

Example:
  node src/uploadScheduler.js posts.csv -v

Files:
  - Logs: ${LOG_DIR}/${logFileName} (scheduling), ${LOG_DIR}/<csvName>_uploaded.log (timestamps), 
          ${CSV_DIR}/<csvName>_upload_history.csv (details), ${LOG_DIR}/${consoleLogFileName} (console output)
  - Config: ${CONFIG_FILE} (tokens stored per token group)
  `;
  console.log(helpText);
  logStream.end();
  process.exit(0);
}

// Schedule posts
async function schedulePosts(postsToSchedule) {
  for (const post of postsToSchedule) {
    const timeDiff = post.time - new Date();
    if (timeDiff > 0) {
      log('INFO', `Scheduling ${post.platform} post for ${post.time.toISOString()} (originally ${post.originalTime.toISOString()})`);
      setTimeout(() => PLATFORMS[post.platform].uploadFunction(post), timeDiff);
    } else {
      log('INFO', `${post.platform} post originally at ${post.originalTime.toISOString()} scheduled in past: ${post.time.toISOString()}`);
    }
  }
}

// Main execution
(async () => {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-help')) return displayHelp();
  if (args.length < 1 || (args.length > 2 && !args.includes('-v'))) {
    console.error('Usage: node src/uploadScheduler.js <csvFilePath> [-v]');
    log('ERROR', 'Usage: node src/uploadScheduler.js <csvFilePath> [-v]');
    logStream.end();
    process.exit(1);
  }

  const csvFilePath = path.join(__dirname, '..', args[0]);
  const csvBaseName = path.basename(csvFilePath, '.csv').replace(/[^a-zA-Z0-9]/g, '_');
  const UPLOADED_LOG = path.join(LOG_DIR, `${csvBaseName}_uploaded.log`);
  const UPLOAD_HISTORY = path.join(CSV_DIR, `${csvBaseName}_upload_history.csv`);

  setupConsoleLogging();
  await ensureDirs([LOG_DIR, BIN_DIR, CSV_DIR, SH_DIR]);

  try {
    await fs.access(csvFilePath);
  } catch (err) {
    console.error(`CSV file not found: ${csvFilePath}`);
    log('ERROR', `CSV file not found: ${csvFilePath}`);
    logStream.end();
    process.exit(1);
  }

  await initializeConfig(); // Load config once

  let uploadedPosts = new Set();
  try {
    const data = await fs.readFile(UPLOADED_LOG, 'utf8');
    uploadedPosts = new Set(data.split('\n').filter(line => line.trim() !== ''));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error reading ${UPLOADED_LOG}: ${err.message}`);
      log('ERROR', `Error reading ${UPLOADED_LOG}: ${err.message}`);
    }
  }

  const posts = [];
  await new Promise((resolve, reject) => {
    require('fs').createReadStream(csvFilePath)
      .pipe(csv({ separator: ',' }))
      .on('data', (row) => {
        const originalTime = DateTime.fromFormat(row['Publish Date'], "yyyy-MM-dd'T'HH:mm:ss").toJSDate();
        if (!originalTime || isNaN(originalTime.getTime())) {
          console.error(`Invalid date in row: ${JSON.stringify(row)}`);
          log('ERROR', `Invalid date in row: ${JSON.stringify(row)}`);
          return;
        }
        if (!PLATFORMS[row.Platform]) {
          console.error(`Invalid platform: ${row.Platform}. Supported: ${Object.keys(PLATFORMS).join(', ')}`);
          log('ERROR', `Invalid platform: ${row.Platform}`);
          return;
        }

        // Validation: Pinterest-specific fields must be empty for non-Pinterest platforms
        const title = row['Title (Pinterest)'] || '';
        const boardId = row['Board ID (Pinterest)'] || '';
        const link = row['External Link (Pinterest)'] || '';
        const altText = row['Alt Text (Pinterest)'] || '';
        
        if (row.Platform !== 'Pinterest' && (title || boardId || link || altText)) {
          console.error(`Invalid row: Pinterest-specific fields (Title, Board ID, Link, Alt Text) must be empty for non-Pinterest platform: ${JSON.stringify(row)}`);
          log('ERROR', `Invalid row: Pinterest-specific fields must be empty for non-Pinterest platform: ${JSON.stringify(row)}`);
          return;
        }

        // Validation: Board ID is required for Pinterest
        if (row.Platform === 'Pinterest' && !boardId) {
          console.error(`Invalid row: Board ID (Pinterest) is required for Pinterest: ${JSON.stringify(row)}`);
          log('ERROR', `Invalid row: Board ID (Pinterest) is required for Pinterest: ${JSON.stringify(row)}`);
          return;
        }

        posts.push({
          platform: row.Platform,
          originalTime,
          time: originalTime,
          imageUrl: row['Media URL'].trim(),
          caption: row['Caption'].trim(),
          hashtags: row['Hashtags'] || '',
          location: row['Location'] || '',
          title,
          boardId,
          link,
          altText,
          uploadHistoryPath: UPLOAD_HISTORY,
          uploadedLogPath: UPLOADED_LOG
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Scheduler: Loaded ${posts.length} posts from CSV`);
  for (const post of posts) {
    const platform = PLATFORMS[post.platform];
    const token = await TOKEN_GROUPS[platform.tokenGroup]();
    post.accessToken = token;
    if (!post.accessToken) {
      console.error(`No valid token available for ${post.platform}`);
      log('ERROR', `No valid token available for ${post.platform}`);
      process.exit(1);
    }
    console.log(`DEBUG: Token for ${post.platform}: ${post.accessToken.substring(0, 10)}...`);
  }

  const now = new Date();
  const futurePosts = posts.filter(p => p.originalTime > now && !uploadedPosts.has(p.originalTime.toISOString()));
  const missedPosts = posts.filter(p => p.originalTime <= now && !uploadedPosts.has(p.originalTime.toISOString()));

  console.info(`Found ${futurePosts.length} future posts and ${missedPosts.length} missed posts.`);
  log('INFO', `Found ${futurePosts.length} future posts and ${missedPosts.length} missed posts.`);

  await schedulePosts(futurePosts);

  if (missedPosts.length > 0) {
    let appendDate;
    if (futurePosts.length > 0) {
      const lastFutureTime = new Date(Math.max(...futurePosts.map(p => p.time.getTime())));
      appendDate = new Date(lastFutureTime);
      appendDate.setDate(appendDate.getDate() + 1);
      appendDate.setHours(0, 0, 0, 0);
    } else {
      appendDate = new Date(now);
      appendDate.setDate(appendDate.getDate() + 1);
      appendDate.setHours(0, 0, 0, 0);
    }

    missedPosts.forEach(missedPost => {
      const originalTime = missedPost.originalTime;
      missedPost.time = new Date(
        appendDate.getFullYear(),
        appendDate.getMonth(),
        appendDate.getDate(),
        originalTime.getHours(),
        originalTime.getMinutes(),
        originalTime.getSeconds()
      );
    });

    await schedulePosts(missedPosts);
  }

  await saveConfig(config); // Save all tokens at the end
  console.info('All posts scheduled. Keep this process running.');
  log('INFO', 'All posts scheduled. Keep this process running.');
})();