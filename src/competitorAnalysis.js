#!/usr/bin/env node

const prompts = require('prompts');
const path = require('path');
const fs = require('fs').promises;
const { DateTime } = require('luxon');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import platform-specific competitor analysis functions
const { getFacebookCompetitorPosts } = require('./competitor-analysis/getFacebookCompetitorPosts');
const { getInstagramCompetitorPosts } = require('./competitor-analysis/getInstagramCompetitorPosts');
const { getPinterestCompetitorPosts } = require('./competitor-analysis/getPinterestCompetitorPosts');
const { getTikTokCompetitorPosts } = require('./competitor-analysis/getTikTokCompetitorPosts');
const { getThreadsCompetitorPosts } = require('./competitor-analysis/getThreadsCompetitorPosts');
const { getYouTubeCompetitorPosts } = require('./competitor-analysis/getYoutubeCompetitorPosts');
const { getRumbleCompetitorPosts } = require('./competitor-analysis/getRumbleCompetitorPosts');
const { getTwitterCompetitorPosts } = require('./competitor-analysis/getTwitterCompetitorPosts');

// Configuration
const LOG_DIR = path.join(__dirname, '..', 'logs');
const BIN_DIR = path.join(__dirname, '..', 'bin');
const CSV_DIR = path.join(BIN_DIR, 'csv');
const VERBOSE = process.argv.includes('-v');
const SCRIPT_NAME = path.basename(__filename, '.js');

// Console logging setup
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

// Analysis-specific logging
const logFileName = `competitorAnalysis-${DateTime.now().setZone('America/New_York').toFormat('yyyy-MM-dd-HH-mm-ss')}.log`;
const logFilePath = path.join(LOG_DIR, logFileName);
const logStream = require('fs').createWriteStream(logFilePath, { flags: 'a' });

const log = (level, message) => {
  const timestamp = DateTime.now().setZone('America/New_York').toISO();
  const logMessage = `${timestamp} [${level}] ${message}`;
  if (!logStream.writableEnded) logStream.write(`${logMessage}\n`);
  if (level === 'ERROR' || VERBOSE || level === 'WARN') originalConsole[level.toLowerCase()](logMessage);
};

// Platform analysis functions
const PLATFORMS = {
  Facebook: getFacebookCompetitorPosts,
  Instagram: getInstagramCompetitorPosts,
  Pinterest: getPinterestCompetitorPosts,
  TikTok: getTikTokCompetitorPosts,
  Threads: getThreadsCompetitorPosts,
  YouTube: getYouTubeCompetitorPosts,
  Rumble: getRumbleCompetitorPosts,
  Twitter: getTwitterCompetitorPosts
};

// Help message
function displayHelp() {
  const helpText = `
competitorAnalysis.js - Analyze competitor social media posts for a given platform.

Usage:
  node competitorAnalysis.js [-v] [--help | -help]

Flags:
  -v            Verbose output
  -help, --help Display this help and exit

Description:
  Prompts for a platform, competitor account, and sorting metric, then retrieves and sorts public post analytics.
  Outputs to ${CSV_DIR}/<platform>_competitor_analysis.csv.

Files:
  - Logs: ${LOG_DIR}/${logFileName} (analysis), ${LOG_DIR}/${consoleLogFileName} (console output)
  `;
  console.log(helpText);
  logStream.end();
  process.exit(0);
}

// Ensure directories exist
async function ensureDirs(dirs) {
  await Promise.all(dirs.map(dir => fs.mkdir(dir, { recursive: true }).catch(err => {
    console.error(`Failed to create directory ${dir}: ${err.message}`);
    process.exit(1);
  })));
}

// Main execution
(async () => {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-help')) return displayHelp();

  setupConsoleLogging();
  await ensureDirs([LOG_DIR, CSV_DIR]);

  // Prompt for platform
  const { platform } = await prompts({
    type: 'select',
    name: 'platform',
    message: 'Select a platform to analyze competitor posts for:',
    choices: Object.keys(PLATFORMS).map(p => ({ title: p, value: p }))
  }, { onCancel: () => process.exit(1) });

  if (!PLATFORMS[platform]) {
    console.error(`Unsupported platform: ${platform}. Supported: ${Object.keys(PLATFORMS).join(', ')}`);
    log('ERROR', `Unsupported platform: ${platform}`);
    logStream.end();
    process.exit(1);
  }

  // Prompt for competitor account
  const { competitor } = await prompts({
    type: 'text',
    name: 'competitor',
    message: `Enter the ${platform} account handle or ID to analyze (e.g., @username or numeric ID):`,
    validate: v => !!v || 'Competitor account is required'
  }, { onCancel: () => process.exit(1) });

  log('INFO', `Starting competitor analysis for ${platform} account: ${competitor}`);
  await PLATFORMS[platform](competitor);

  console.info(`Competitor analysis complete. Results saved to ${CSV_DIR}/${platform.toLowerCase()}_competitor_analysis.csv`);
  log('INFO', 'Competitor analysis complete.');
})();