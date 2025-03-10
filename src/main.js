#!/usr/bin/env node

const prompts = require('prompts');
const path = require('path');
const fs = require('fs');
const { DateTime } = require('luxon');
const {
  scheduleFacebookPosts,
  scheduleInstagramPosts,
  schedulePinterestPosts,
  scheduleTikTokPosts,
  scheduleThreadsPosts,
  scheduleYouTubePosts,
  scheduleRumblePosts,
  scheduleTwitterPosts
} = require('./domain/scheduler');
const {
  getFacebookAccountPosts,
  getInstagramAccountPosts,
  getPinterestAccountPosts,
  getTikTokAccountPosts,
  getThreadsAccountPosts,
  getYouTubeAccountPosts,
  getRumbleAccountPosts,
  getTwitterAccountPosts,
  ACCOUNT_POST_METRICS
} = require('./domain/accountPosts');
const { getTopPosts, COMMON_METRICS } = require('./domain/topHashtagPosts');
const { loadConfig, saveConfig } = require('./backend/auth/authUtils');
const { getFacebookToken } = require('./backend/auth/facebookAuth');
const { getInstagramThreadsToken } = require('./backend/auth/instagramThreadsAuth');
const { getPinterestToken } = require('./backend/auth/pinterestAuth');
const { getTikTokToken } = require('./backend/auth/tiktokAuth');
const { getTwitterToken } = require('./backend/auth/twitterAuth');
const { getYouTubeToken } = require('./backend/auth/youtubeAuth');
const { getRumbleToken } = require('./backend/auth/rumbleAuth');
const { log, setupConsoleLogging } = require('./backend/logging/logUtils');

// Configuration
const BASE_DIR = path.join(__dirname, '..'); // One level up from main.js
const BIN_DIR = path.join(BASE_DIR, 'bin');
const IMG_DIR = path.join(BIN_DIR, 'img');
const VID_DIR = path.join(BIN_DIR, 'vid');
const CSV_DIR = path.join(BIN_DIR, 'csv');
const JSON_DIR = path.join(BASE_DIR, 'json');
const LOG_DIR = path.join(BASE_DIR, 'logs');

// CSV Formats
const CSV_FORMATS = {
  facebook: 'Publish Date,Media URL,Caption,Hashtags,Location',
  instagram: 'Publish Date,Media URL,Caption,Hashtags,Location',
  pinterest: 'Publish Date,Media URL,Caption,Hashtags,Location,Title,Board ID,External Link,Alt Text',
  tiktok: 'Publish Date,Media URL,Caption,Hashtags',
  threads: 'Publish Date,Media URL,Caption,Hashtags,Location',
  youtube: 'Publish Date,Media URL,Caption,Hashtags,Location,Duration (seconds)',
  rumble: 'Publish Date,Media URL,Caption,Hashtags,Location,Duration (seconds)',
  x: 'Publish Date,Media URL,Caption,Hashtags,Location',
};

function displayCsvFormat(platform) {
  log('INFO', `\nCSV Format for ${platform.charAt(0).toUpperCase() + platform.slice(1)}:`);
  log('INFO', `"${CSV_FORMATS[platform]}"`);
  log('INFO', 'Notes:');
  log('INFO', '- Publish Date: Format as "yyyy-MM-dd\'T\'HH:mm:ss" (e.g., "2025-03-10T12:00:00")');
  log('INFO', '- Media URL: Use .jpg, .png for images; .mp4, .mov for videos');
  if (platform === 'youtube' || platform === 'rumble') {
    log('INFO', '- Duration: Optional, in seconds; used to classify short (<60s) vs long videos');
  }
  log('INFO', '\n');
}

// Help message
function displayHelp() {
  const helpText = `
main.js - Social media tool for scheduling and data retrieval.

Usage:
  node main.js [--help]

Options:
  --help  Display this help and exit

Features:
  - Scheduling: Schedules posts for a specific platform using a CSV file.
  - Get Top Posts by Hashtag/Keyword: Retrieves top posts or videos for a hashtag/keyword.
  - Get Account Post Data: Retrieves post data for an account.

Supported Platforms: Facebook, Instagram, Pinterest, TikTok, Threads, YouTube, Rumble, X (Twitter)

Requirements:
  - .env file with credentials (e.g., APP_ID, APP_SECRET, PAGE_ID, etc.)

Logs:
  - Console: ${LOG_DIR}/main-<timestamp>.log
  - Scheduler: ${LOG_DIR}/scheduler-<platform>-<timestamp>.log
  `;
  log('INFO', helpText);
  process.exit(0);
}

// Ensure directories exist
async function ensureDirectories() {
  const dirs = [BIN_DIR, IMG_DIR, VID_DIR, CSV_DIR, JSON_DIR, LOG_DIR];
  await Promise.all(dirs.map(dir => fs.promises.mkdir(dir, { recursive: true }).catch(err => {
    log('ERROR', `Failed to create directory ${dir}: ${err.message}`);
    process.exit(1);
  })));
  log('INFO', 'All required directories are present.');
}

// Platform definitions
const SCHEDULERS = {
  facebook: scheduleFacebookPosts,
  instagram: scheduleInstagramPosts,
  pinterest: schedulePinterestPosts,
  tiktok: scheduleTikTokPosts,
  threads: scheduleThreadsPosts,
  youtube: scheduleYouTubePosts,
  rumble: scheduleRumblePosts,
  x: scheduleTwitterPosts,
};

const POSTS = {
  facebook: getFacebookAccountPosts,
  instagram: getInstagramAccountPosts,
  pinterest: getPinterestAccountPosts,
  tiktok: getTikTokAccountPosts,
  threads: getThreadsAccountPosts,
  youtube: getYouTubeAccountPosts,
  rumble: getRumbleAccountPosts,
  x: getTwitterAccountPosts,
};

const TOKENS = {
  facebook: getFacebookToken,
  instagram: getInstagramThreadsToken,
  pinterest: getPinterestToken,
  tiktok: getTikTokToken,
  threads: getInstagramThreadsToken,
  youtube: getYouTubeToken,
  rumble: getRumbleToken,
  x: getTwitterToken,
};

// Main execution
(async () => {
  try {
    setupConsoleLogging(); // Call early, though it’s a no-op with centralized setup
    log('DEBUG', 'Starting main execution');
    const args = process.argv.slice(2);
    if (args.includes('--help')) return displayHelp();
    if (args.includes('-v') || args.includes('--version')) {
      log('INFO', 'Social Media HQ v1.0.0'); // Added version flag
      process.exit(0);
    }

    log('DEBUG', 'Ensuring directories');
    await ensureDirectories();
    log('DEBUG', 'Setting up console logging'); // Kept for clarity
    log('DEBUG', 'Loading config');
    const config = await loadConfig();
    log('DEBUG', `Config loaded: ${JSON.stringify(config)}`);
    let state = 'mode';

    while (true) {
      log('DEBUG', `Entering state: ${state}`);
      if (state === 'mode') {
        log('DEBUG', 'Prompting for mode selection');
        const modeResponse = await prompts({
          type: 'select',
          name: 'mode',
          message: 'What would you like to do?',
          choices: [
            { title: 'Scheduling', value: 'scheduling' },
            { title: 'Get Top Posts by Hashtag/Keyword', value: 'topposts' },
            { title: 'Get Account Post Data', value: 'postdata' },
            { title: 'Exit', value: 'exit' },
          ],
          initial: 0,
        });

        log('DEBUG', `Mode response: ${JSON.stringify(modeResponse)}`);
        if (modeResponse.mode === 'exit' || !modeResponse.mode) {
          log('INFO', 'Exiting.');
          await saveConfig(config);
          process.exit(0);
        }

        state = modeResponse.mode;
      } else if (state === 'scheduling') {
        log('DEBUG', 'Prompting for scheduling platform');
        const platformResponse = await prompts({
          type: 'select',
          name: 'platform',
          message: 'Prompt 1a: Choose a platform for scheduling:',
          choices: [
            { title: 'Facebook', value: 'facebook' },
            { title: 'Instagram', value: 'instagram' },
            { title: 'Pinterest', value: 'pinterest' },
            { title: 'TikTok', value: 'tiktok' },
            { title: 'Threads', value: 'threads' },
            { title: 'YouTube', value: 'youtube' },
            { title: 'Rumble', value: 'rumble' },
            { title: 'X (Twitter)', value: 'x' },
            { title: 'Go Back', value: 'back' },
          ],
          initial: 0,
        });

        log('DEBUG', `Platform response: ${JSON.stringify(platformResponse)}`);
        if (!platformResponse.platform) {
          log('INFO', 'No platform selected. Exiting.');
          await saveConfig(config);
          process.exit(0);
        }

        if (platformResponse.platform === 'back') {
          state = 'mode';
          continue;
        }

        const platform = platformResponse.platform;
        displayCsvFormat(platform);

        log('DEBUG', `Checking authentication for ${platform}`);
        let token;
        try {
          token = await TOKENS[platform](config);
          log('DEBUG', `Token obtained for ${platform}: ${token.substring(0, 10)}...`);
        } catch (error) {
          log('ERROR', `Authentication failed for ${platform}: ${error.message}`);
          state = 'mode';
          continue;
        }

        log('DEBUG', 'Prompting for CSV path');
        const csvResponse = await prompts({
          type: 'text',
          name: 'csvPath',
          message: `Prompt 2a: Enter the path to your ${platform} CSV file (or type "back" to return):`,
          initial: path.join(CSV_DIR, `${platform}_posts.csv`),
          validate: async value => {
            if (value.toLowerCase() === 'back') return true;
            try {
              await fs.promises.access(value);
              return true;
            } catch {
              return 'File not found. Please enter a valid path or "back".';
            }
          },
        });

        log('DEBUG', `CSV response: ${JSON.stringify(csvResponse)}`);
        if (!csvResponse.csvPath) {
          log('INFO', 'No input provided. Exiting.');
          await saveConfig(config);
          process.exit(0);
        }

        if (csvResponse.csvPath.toLowerCase() === 'back') {
          state = 'scheduling';
          continue;
        }

        log('INFO', `Scheduling posts for ${platform} with CSV: ${csvResponse.csvPath}`);
        await SCHEDULERS[platform](csvResponse.csvPath, config);
        log('INFO', 'Task completed. You can run the tool again.');
        state = 'mode';
      } else if (state === 'topposts') {
        log('DEBUG', 'Prompting for topposts platform');
        const platformResponse = await prompts({
          type: 'select',
          name: 'platform',
          message: 'Prompt 1b: Choose a platform for getting top posts:',
          choices: [
            { title: 'Facebook', value: 'facebook' },
            { title: 'Instagram', value: 'instagram' },
            { title: 'Pinterest', value: 'pinterest' },
            { title: 'TikTok', value: 'tiktok' },
            { title: 'Threads', value: 'threads' },
            { title: 'YouTube', value: 'youtube' },
            { title: 'Rumble', value: 'rumble' },
            { title: 'X (Twitter)', value: 'x' },
            { title: 'Go Back', value: 'back' },
          ],
          initial: 0,
        });

        log('DEBUG', `Platform response: ${JSON.stringify(platformResponse)}`);
        if (!platformResponse.platform) {
          log('INFO', 'No platform selected. Exiting.');
          await saveConfig(config);
          process.exit(0);
        }

        if (platformResponse.platform === 'back') {
          state = 'mode';
          continue;
        }

        const platform = platformResponse.platform;

        log('DEBUG', `Checking authentication for ${platform}`);
        let token;
        try {
          token = await TOKENS[platform](config);
          log('DEBUG', `Token obtained for ${platform}: ${token.substring(0, 10)}...`);
        } catch (error) {
          log('ERROR', `Authentication failed for ${platform}: ${error.message}`);
          state = 'mode';
          continue;
        }

        log('DEBUG', 'Prompting for hashtag');
        const hashtagResponse = await prompts({
          type: 'text',
          name: 'hashtag',
          message: 'Prompt 2b: Enter a hashtag or keyword (or "back" to return):',
          validate: value => value.toLowerCase() === 'back' || !!value || 'Hashtag/keyword is required',
        });

        log('DEBUG', `Hashtag response: ${JSON.stringify(hashtagResponse)}`);
        if (!hashtagResponse.hashtag) {
          log('INFO', 'No hashtag provided. Exiting.');
          await saveConfig(config);
          process.exit(0);
        }

        if (hashtagResponse.hashtag.toLowerCase() === 'back') {
          state = 'topposts';
          continue;
        }

        log('DEBUG', 'Prompting for metric');
        const metricResponse = await prompts({
          type: 'select',
          name: 'metric',
          message: 'Prompt 3b: Choose a metric to sort by:',
          choices: COMMON_METRICS.map(metric => ({
            title: metric.charAt(0).toUpperCase() + metric.slice(1),
            value: metric,
          })).concat([{ title: 'Go Back', value: 'back' }]),
          initial: 0,
        });

        log('DEBUG', `Metric response: ${JSON.stringify(metricResponse)}`);
        if (!metricResponse.metric) {
          log('INFO', 'No metric selected. Exiting.');
          await saveConfig(config);
          process.exit(0);
        }

        if (metricResponse.metric === 'back') {
          state = 'topposts';
          continue;
        }

        log('INFO', `Retrieving top posts for ${platform} with hashtag/keyword: ${hashtagResponse.hashtag}, sorted by ${metricResponse.metric}`);
        try {
          const csvPath = await getTopPosts(platform, hashtagResponse.hashtag, metricResponse.metric, config);
          log('INFO', `Top posts retrieved and saved to ${csvPath}`);
        } catch (error) {
          log('ERROR', `Failed to retrieve top posts for ${platform}: ${error.message}`);
        }
        state = 'mode';
      } else if (state === 'postdata') {
        log('DEBUG', 'Prompting for postdata platform');
        const platformResponse = await prompts({
          type: 'select',
          name: 'platform',
          message: 'Prompt 1c: Choose a platform for getting account post data:',
          choices: [
            { title: 'Facebook', value: 'facebook' },
            { title: 'Instagram', value: 'instagram' },
            { title: 'Pinterest', value: 'pinterest' },
            { title: 'TikTok', value: 'tiktok' },
            { title: 'Threads', value: 'threads' },
            { title: 'YouTube', value: 'youtube' },
            { title: 'Rumble', value: 'rumble' },
            { title: 'X (Twitter)', value: 'x' },
            { title: 'Go Back', value: 'back' },
          ],
          initial: 0,
        });

        log('DEBUG', `Platform response: ${JSON.stringify(platformResponse)}`);
        if (!platformResponse.platform) {
          log('INFO', 'No platform selected. Exiting.');
          await saveConfig(config);
          process.exit(0);
        }

        if (platformResponse.platform === 'back') {
          state = 'mode';
          continue;
        }

        const platform = platformResponse.platform;

        log('DEBUG', `Checking authentication for ${platform}`);
        let token;
        if (TOKENS[platform]) {
          try {
            token = await TOKENS[platform](config);
            log('DEBUG', `Token obtained for ${platform}: ${token.substring(0, 10)}...`);
          } catch (error) {
            log('ERROR', `Authentication failed for ${platform}: ${error.message}`);
            state = 'mode';
            continue;
          }
        }

        log('DEBUG', 'Prompting for account type');
        const accountTypeResponse = await prompts({
          type: 'select',
          name: 'accountType',
          message: `Prompt 2c: Analyze ${platform} posts for:`,
          choices: [
            { title: 'My Account', value: 'my' },
            { title: 'Public Account', value: 'public' },
            { title: 'Go Back', value: 'back' },
          ],
          initial: 0,
        });

        log('DEBUG', `Account type response: ${JSON.stringify(accountTypeResponse)}`);
        if (!accountTypeResponse.accountType) {
          log('INFO', 'No account type selected. Exiting.');
          await saveConfig(config);
          process.exit(0);
        }

        if (accountTypeResponse.accountType === 'back') {
          state = 'postdata';
          continue;
        }

        log('DEBUG', 'Prompting for account');
        const accountResponse = await prompts({
          type: 'text',
          name: 'account',
          message: `Prompt 3c: Enter the ${platform} ${accountTypeResponse.accountType === 'my' ? 'account ID' : 'account handle or ID'} (e.g., @username or numeric ID, or "back" to return):`,
          validate: value => value.toLowerCase() === 'back' || !!value || 'Account is required',
        });

        log('DEBUG', `Account response: ${JSON.stringify(accountResponse)}`);
        if (!accountResponse.account) {
          log('INFO', 'No account provided. Exiting.');
          await saveConfig(config);
          process.exit(0);
        }

        if (accountResponse.account.toLowerCase() === 'back') {
          state = 'postdata';
          continue;
        }

        log('DEBUG', 'Prompting for metric');
        const metricResponse = await prompts({
          type: 'select',
          name: 'metric',
          message: `Prompt 4c: Sort ${platform} posts by:`,
          choices: ACCOUNT_POST_METRICS.map(metric => ({
            title: metric.charAt(0).toUpperCase() + metric.slice(1),
            value: metric,
          })).concat([{ title: 'Go Back', value: 'back' }]),
          initial: 0,
        });

        log('DEBUG', `Metric response: ${JSON.stringify(metricResponse)}`);
        if (!metricResponse.metric) {
          log('INFO', 'No metric selected. Exiting.');
          await saveConfig(config);
          process.exit(0);
        }

        if (metricResponse.metric === 'back') {
          state = 'postdata';
          continue;
        }

        if (POSTS[platform]) {
          log('INFO', `Retrieving post data for ${platform} ${accountTypeResponse.accountType === 'my' ? 'my account' : 'public account'}: ${accountResponse.account}, sorted by ${metricResponse.metric}`);
          try {
            const csvPath = await POSTS[platform](accountResponse.account, accountTypeResponse.accountType === 'my', metricResponse.metric);
            log('INFO', `Post data retrieved and saved to ${csvPath}`);
          } catch (error) {
            log('ERROR', `Failed to retrieve post data for ${platform}: ${error.message}`);
          }
        } else {
          log('INFO', `Get Account Post Data for ${platform} is not implemented yet.`);
        }
        state = 'mode';
      }
    }
  } catch (err) {
    log('ERROR', `Unexpected error or interruption: ${err.message}`);
    try {
      const config = await loadConfig();
      await saveConfig(config);
    } catch (saveErr) {
      log('ERROR', `Failed to save config on exit: ${saveErr.message}`);
    }
    process.exit(1);
  }
})();