#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');
const { DateTime } = require('luxon');

// Import auth modules
const { getMetaToken } = require('./auth/instagramAuth');
const { getTwitterToken } = require('./auth/twitterAuth');
const { getPinterestToken } = require('./auth/pinterestAuth');
const { getTikTokToken } = require('./auth/tiktokAuth');

// Import hashtag functions
const { getTwitterHashtags } = require('./hashtag/getTwitterHashtags');
const { getInstagramHashtags } = require('./hashtag/getInstagramHashtags');
const { getFacebookHashtags } = require('./hashtag/getFacebookHashtags');
const { getThreadsHashtags } = require('./hashtag/getThreadsHashtags');
const { getPinterestHashtags } = require('./hashtag/getPinterestHashtags');
const { getTikTokHashtags } = require('./hashtag/getTikTokHashtags');

// Load environment variables from .env (relative to project root)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configuration
const LOG_DIR = path.join(__dirname, '..', 'logs');
const BIN_DIR = path.join(__dirname, '..', 'bin');
const CSV_DIR = path.join(BIN_DIR, 'csv', 'hashtags');
const SH_DIR = path.join(BIN_DIR, 'sh');
const VERBOSE = process.argv.includes('-v');
const SCRIPT_NAME = path.basename(__filename, '.js');

// Token group to auth function mapping
const TOKEN_GROUPS = {
  Meta: getMetaToken,
  Twitter: getTwitterToken,
  Pinterest: getPinterestToken,
  TikTok: getTikTokToken,
};

// Platform definitions with hashtag functions and token groups
const PLATFORMS = {
  Twitter: { getHashtags: getTwitterHashtags, tokenGroup: 'Twitter' },
  Instagram: { getHashtags: getInstagramHashtags, tokenGroup: 'Meta' },
  Facebook: { getHashtags: getFacebookHashtags, tokenGroup: 'Meta' },
  Threads: { getHashtags: getThreadsHashtags, tokenGroup: 'Meta' },
  Pinterest: { getHashtags: getPinterestHashtags, tokenGroup: 'Pinterest' },
  TikTok: { getHashtags: getTikTokHashtags, tokenGroup: 'TikTok' },
};

// Ensure directories exist
async function ensureDirs(dirs) {
  await Promise.all(
    dirs.map((dir) =>
      fs.mkdir(dir, { recursive: true }).catch((err) => {
        console.error(`Failed to create directory ${dir}: ${err.message}`);
        process.exit(1);
      })
    )
  );
}

// Console logging setup with unique file per execution
const consoleLogFileName = `${SCRIPT_NAME}-${DateTime.now()
  .setZone('America/New_York')
  .toFormat('yyyy-MM-dd-HH-mm-ss')}.log`;
const consoleLogPath = path.join(LOG_DIR, consoleLogFileName);
const consoleLogStream = require('fs').createWriteStream(consoleLogPath, { flags: 'a' });

const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

function setupConsoleLogging() {
  const logToFile = (level, ...args) => {
    const timestamp = DateTime.now().setZone('America/New_York').toISO();
    const message = args
      .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
      .join(' ');
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

// Format frequency into K/M notation
function formatFrequency(frequency) {
  if (frequency >= 1000000) {
    return `${(frequency / 1000000).toFixed(1)}M`;
  } else if (frequency >= 1000) {
    return `${(frequency / 1000).toFixed(1)}K`;
  }
  return frequency.toString();
}

// Help message
function displayHelp() {
  const helpText = `
gatherHashtags.js - Gather related hashtags for a given platform and seed keyword.

Usage:
  node src/gatherHashtags.js <platform> <seedKeyword> [-v] [--help | -help]

Platforms:
  Twitter, Instagram, Facebook, Threads, Pinterest, TikTok
  (YouTube and Rumble ignored due to lack of hashtag API support)

Flags:
  -v            Verbose output
  -help, --help Display this help and exit

Example:
  node src/gatherHashtags.js Twitter travel -v

Output:
  CSV file in bin/csv/hashtags/<platform>/<seedKeyword>_<timestamp>.csv with columns:
  - Hashtag: Related hashtag
  - Frequency: Number of occurrences (in K/M format, e.g., 1K, 1M)
  `;
  console.log(helpText);
  process.exit(0);
}

// Main execution
(async () => {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-help')) return displayHelp();
  if (args.length < 2 || (args.length > 3 && !args.includes('-v'))) {
    console.error('Usage: node src/gatherHashtags.js <platform> <seedKeyword> [-v]');
    process.exit(1);
  }

  const platform = args[0];
  const seedKeyword = args[1];
  const platformKey = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();

  if (!PLATFORMS[platformKey]) {
    console.error(
      `Unsupported platform: ${platform}. Supported: ${Object.keys(PLATFORMS).join(', ')}`
    );
    process.exit(1);
  }

  setupConsoleLogging();
  await ensureDirs([LOG_DIR, BIN_DIR, CSV_DIR, SH_DIR]);

  try {
    const tokenGroup = PLATFORMS[platformKey].tokenGroup;
    const token = await TOKEN_GROUPS[tokenGroup](); // Correct token retrieval
    const getHashtags = PLATFORMS[platformKey].getHashtags;
    const hashtags = await getHashtags(seedKeyword, token);

    const csvDir = path.join(CSV_DIR, platform.toLowerCase());
    await ensureDirs([csvDir]);
    const timestamp = DateTime.now().toFormat('yyyyMMddHHmmss');
    const csvFilePath = path.join(csvDir, `${seedKeyword}_${timestamp}.csv`);
    const csvContent = [
      'Hashtag,Frequency',
      ...hashtags.map((h) => `${h.hashtag},${formatFrequency(h.frequency)}`),
    ].join('\n');
    await fs.writeFile(csvFilePath, csvContent);
    console.log(`Hashtags saved to ${csvFilePath}`);
  } catch (error) {
    console.error(`Error gathering hashtags: ${error.message}`);
    process.exit(1);
  }
})();