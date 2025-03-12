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
} = require('./feature/scheduler');
const {
  getFacebookAccountPosts,
  getInstagramAccountPosts,
  getPinterestAccountPosts,
  getTikTokAccountPosts,
  getThreadsAccountPosts,
  getYouTubeAccountPosts,
  getRumbleAccountPosts,
  getTwitterAccountPosts
} = require('./feature/accountPosts');
const { getTopPosts, COMMON_METRICS } = require('./feature/topHashtagPosts');
const { loadConfig, saveConfig } = require('./backend/utils/authUtils');
const { getFacebookToken } = require('./backend/auth/facebookAuth');
const { getInstagramThreadsToken } = require('./backend/auth/instagramThreadsAuth');
const { getPinterestToken } = require('./backend/auth/pinterestAuth');
const { getTikTokToken } = require('./backend/auth/tiktokAuth');
const { getTwitterToken } = require('./backend/auth/twitterAuth');
const { getYouTubeToken } = require('./backend/auth/youtubeAuth');
const { getRumbleToken } = require('./backend/auth/rumbleAuth');
const { log, setupConsoleLogging } = require('./backend/utils/logUtils');

// Configuration
const BASE_DIR = path.join(__dirname, '..');
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

// Platform-specific config requirements
const PLATFORM_CONFIGS = {
  facebook: ['APP_ID', 'APP_SECRET', 'PAGE_ID'],
  instagram: ['APP_ID', 'APP_SECRET', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'],
  pinterest: ['PINTEREST_APP_ID', 'PINTEREST_APP_SECRET'],
  tiktok: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
  threads: ['APP_ID', 'APP_SECRET', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'],
  youtube: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
  rumble: [], // Hypothetical; no API, so no config needed yet
  x: [] // Twitter uses bearer token directly
};

// Platform-specific metrics (all gathered data points that can be sorted)
const PLATFORM_METRICS = {
  facebook: ['likes', 'comments', 'shares', 'engagement'],
  instagram: ['likes', 'comments', 'engagement'],
  pinterest: ['likes', 'comments', 'engagement'],
  tiktok: ['likes', 'comments', 'views', 'shares', 'engagement'],
  threads: ['likes', 'comments', 'engagement'],
  youtube: ['likes', 'comments', 'views', 'engagement'],
  rumble: ['likes', 'comments', 'views', 'engagement'], // Hypothetical
  x: ['likes', 'comments', 'views', 'retweets', 'engagement'],
};

function displayCsvFormat(platform, verbose = false) {
  log('INFO', `\nCSV Format for ${platform.charAt(0).toUpperCase() + platform.slice(1)}:`);
  log('INFO', `"${CSV_FORMATS[platform]}"`);
  log('INFO', 'Notes:');
  log('INFO', '- Publish Date: Format as "yyyy-MM-dd\'T\'HH:mm:ss" (e.g., "2025-03-10T12:00:00")');
  log('INFO', '- Media URL: Use .jpg, .png for images; .mp4, .mov for videos');
  if (platform === 'youtube' || platform === 'rumble') {
    log('INFO', '- Duration: Optional, in seconds; used to classify short (<60s) vs long videos');
  }
  if (verbose) {
    log('VERBOSE', `Full CSV format details displayed for ${platform}`);
  }
  log('INFO', '\n');
}

// Help message
function displayHelp(verbose = false) {
  const helpText = `
main.js - Social media tool for scheduling and data retrieval.

Usage:
  node main.js [--help] [--verbose]

Options:
  --help     Display this help and exit
  --verbose  Enable verbose logging

Features:
  - Scheduling: Schedules posts for a specific platform using a CSV file.
  - Get Top Posts by Hashtag/Keyword: Retrieves top posts or videos for a hashtag/keyword.
  - Get Account Post Data: Retrieves all post data for an account (yours or another's).

Supported Platforms: Facebook, Instagram, Pinterest, TikTok, Threads, YouTube, Rumble, X (Twitter)

Requirements:
  - Config stored in ${path.join(JSON_DIR, 'config.json')}

Logs:
  - Console: ${LOG_DIR}/main-<timestamp>.log
  - Scheduler: ${LOG_DIR}/scheduler-<platform>-<timestamp>.log
  `;
  log('INFO', helpText);
  if (verbose) {
    log('VERBOSE', 'Help displayed with verbose mode enabled');
  }
  process.exit(0);
}

// Ensure directories exist
async function ensureDirectories(verbose = false) {
  const dirs = [BIN_DIR, IMG_DIR, VID_DIR, CSV_DIR, JSON_DIR, LOG_DIR];
  await Promise.all(dirs.map(dir => fs.promises.mkdir(dir, { recursive: true }).catch(err => {
    log('ERROR', `Failed to create directory ${dir}: ${err.message}`);
    process.exit(1);
  })));
  log('INFO', 'All required directories are present.');
  if (verbose) {
    log('VERBOSE', `Checked directories: ${dirs.join(', ')}`);
  }
}

// Prompt for missing config values
async function promptForConfig(config, platform) {
  if (!config.platforms) config.platforms = {};
  if (!config.platforms[platform]) config.platforms[platform] = {};

  const requiredFields = PLATFORM_CONFIGS[platform];
  for (const field of requiredFields) {
    if (!config.platforms[platform][field]) {
      const response = await prompts({
        type: 'text',
        name: 'value',
        message: `Enter ${field} for ${platform} (required):`,
        validate: value => value ? true : `${field} is required`,
      }, { onCancel: () => { throw new Error('User cancelled config prompt'); } });

      if (!response.value) {
        log('INFO', `User cancelled ${field} prompt for ${platform}`);
        throw new Error('User chose to go back');
      }

      config.platforms[platform][field] = response.value;
      log('INFO', `${field} for ${platform} set and will be saved to config.json`);
    }
  }

  await saveConfig(config);
  return config;
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
    const args = process.argv.slice(2);
    const verbose = args.includes('--verbose');
    await setupConsoleLogging(verbose); // Now async
    log('DEBUG', 'Starting main execution');
    if (args.includes('--help')) return displayHelp(verbose);
    if (args.includes('-v') || args.includes('--version')) {
      log('INFO', 'Social Media HQ v1.0.0');
      if (verbose) log('VERBOSE', 'Version checked');
      process.exit(0);
    }

    log('DEBUG', 'Ensuring directories');
    await ensureDirectories(verbose);
    log('DEBUG', 'Loading config');
    let config = await loadConfig();
    log('DEBUG', `Config loaded: ${JSON.stringify(config)}`);
    if (verbose) log('VERBOSE', 'Configuration loaded successfully');
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
          if (verbose) log('VERBOSE', 'User chose to exit');
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
            { title: 'Back', value: 'back' },
          ],
          initial: 0,
        });

        log('DEBUG', `Platform response: ${JSON.stringify(platformResponse)}`);
        if (!platformResponse.platform) {
          log('INFO', 'No platform selected. Exiting.');
          if (verbose) log('VERBOSE', 'User cancelled platform selection');
          await saveConfig(config);
          process.exit(0);
        }

        if (platformResponse.platform === 'back') {
          state = 'mode';
          if (verbose) log('VERBOSE', 'User chose to go back to main menu');
          continue;
        }

        const platform = platformResponse.platform;
        displayCsvFormat(platform, verbose);

        try {
          config = await promptForConfig(config, platform);
        } catch (error) {
          if (error.message === 'User chose to go back') {
            log('INFO', `User opted to go back from ${platform} config prompt`);
            state = 'mode';
            continue;
          }
          log('ERROR', `Config setup failed for ${platform}: ${error.message}`);
          state = 'mode';
          continue;
        }

        log('DEBUG', `Checking authentication for ${platform}`);
        let token;
        try {
          token = await TOKENS[platform](config);
          log('DEBUG', `Token obtained for ${platform}: ${token.substring(0, 10)}...`);
          if (verbose) log('VERBOSE', `Authentication successful for ${platform}`);
        } catch (error) {
          if (error.message === 'User chose to go back') {
            log('INFO', `User opted to go back from ${platform} auth prompt`);
            if (verbose) log('VERBOSE', 'User cancelled auth prompt');
            state = 'mode';
            continue;
          }
          log('ERROR', `Authentication failed for ${platform}: ${error.message}`);
          if (verbose) log('VERBOSE', `Auth error details: ${error.stack}`);
          state = 'mode';
          continue;
        }

        log('DEBUG', 'Prompting for CSV path');
        const csvResponse = await prompts({
          type: 'text',
          name: 'csvPath',
          message: `Prompt 2a: Enter the path to your ${platform} CSV file (or press Enter to return):`,
          initial: path.join(CSV_DIR, `${platform}_posts.csv`),
          validate: async value => {
            if (value === '') return true;
            try {
              await fs.promises.access(value);
              return true;
            } catch {
              return 'File not found. Please enter a valid path or press Enter.';
            }
          },
        });

        log('DEBUG', `CSV response: ${JSON.stringify(csvResponse)}`);
        if (!csvResponse.csvPath) {
          log('INFO', 'No input provided. Exiting.');
          if (verbose) log('VERBOSE', 'User cancelled CSV prompt');
          await saveConfig(config);
          process.exit(0);
        }

        if (csvResponse.csvPath === '') {
          state = 'mode';
          if (verbose) log('VERBOSE', 'User pressed Enter to return to main menu');
          continue;
        }

        log('INFO', `Scheduling posts for ${platform} with CSV: ${csvResponse.csvPath}`);
        if (verbose) log('VERBOSE', `Starting scheduling process for ${platform}`);
        await SCHEDULERS[platform](csvResponse.csvPath, config);
        log('INFO', 'Task completed. You can run the tool again or keep it running for scheduled posts.');
        if (verbose) log('VERBOSE', 'Scheduling task completed');
        state = 'mode';
      } else if (state === 'topposts') {
        log('DEBUG', 'Prompting for platform selection for top posts');
        const platformResponse = await prompts({
          type: 'select',
          name: 'platform',
          message: 'Prompt 1c: Choose a platform to retrieve top posts from:',
          choices: [
            { title: 'Facebook', value: 'facebook' },
            { title: 'Instagram', value: 'instagram' },
            { title: 'Pinterest', value: 'pinterest' },
            { title: 'TikTok', value: 'tiktok' },
            { title: 'Threads', value: 'threads' },
            { title: 'YouTube', value: 'youtube' },
            { title: 'Rumble', value: 'rumble' },
            { title: 'X (Twitter)', value: 'x' },
            { title: 'Back', value: 'back' },
          ],
          initial: 0,
        });

        log('DEBUG', `Platform response: ${JSON.stringify(platformResponse)}`);
        if (!platformResponse.platform) {
          log('INFO', 'No platform selected. Exiting.');
          if (verbose) log('VERBOSE', 'User cancelled platform selection');
          await saveConfig(config);
          process.exit(0);
        }

        if (platformResponse.platform === 'back') {
          state = 'mode';
          if (verbose) log('VERBOSE', 'User chose to go back to main menu');
          continue;
        }

        const platform = platformResponse.platform;

        try {
          config = await promptForConfig(config, platform);
        } catch (error) {
          if (error.message === 'User chose to go back') {
            log('INFO', `User opted to go back from ${platform} config prompt`);
            state = 'mode';
            continue;
          }
          log('ERROR', `Config setup failed for ${platform}: ${error.message}`);
          state = 'mode';
          continue;
        }

        log('DEBUG', `Checking authentication for ${platform}`);
        let token;
        try {
          token = await TOKENS[platform](config);
          log('DEBUG', `Token obtained for ${platform}: ${token.substring(0, 10)}...`);
          if (verbose) log('VERBOSE', `Authentication successful for ${platform}`);
        } catch (error) {
          if (error.message === 'User chose to go back') {
            log('INFO', `User opted to go back from ${platform} auth prompt`);
            if (verbose) log('VERBOSE', 'User cancelled auth prompt');
            state = 'mode';
            continue;
          }
          log('ERROR', `Authentication failed for ${platform}: ${error.message}`);
          if (verbose) log('VERBOSE', `Auth error details: ${error.stack}`);
          state = 'mode';
          continue;
        }

        log('DEBUG', 'Prompting for hashtag/keyword and metric');
        const topPostsResponse = await prompts([
          {
            type: 'text',
            name: 'hashtag',
            message: `Enter the hashtag or keyword for ${platform} (e.g., #example or keyword, press Enter to return):`,
            validate: value => value ? true : 'Hashtag/keyword is required',
          },
          {
            type: 'select',
            name: 'metric',
            message: 'Sort top posts by which metric?',
            choices: PLATFORM_METRICS[platform].map(m => ({ title: m, value: m })),
            initial: 0,
          },
        ]);

        log('DEBUG', `Top posts response: ${JSON.stringify(topPostsResponse)}`);
        if (!topPostsResponse.hashtag || !topPostsResponse.metric) {
          log('INFO', 'Incomplete input. Exiting.');
          if (verbose) log('VERBOSE', 'User cancelled top posts prompt');
          await saveConfig(config);
          process.exit(0);
        }

        if (topPostsResponse.hashtag === '') {
          state = 'mode';
          if (verbose) log('VERBOSE', 'User pressed Enter to return to main menu');
          continue;
        }

        const hashtag = topPostsResponse.hashtag;
        const metric = topPostsResponse.metric;

        log('INFO', `Retrieving top posts for ${platform} with hashtag/keyword: ${hashtag}, sorted by ${metric}`);
        if (verbose) log('VERBOSE', `Starting top posts retrieval for ${platform}, hashtag: ${hashtag}, metric: ${metric}`);
        const csvPath = await getTopPosts(platform, hashtag, metric, config, verbose);
        log('INFO', `Top posts retrieval completed. Results saved to ${csvPath}`);
        if (verbose) log('VERBOSE', 'Top posts retrieval task completed');
        state = 'mode';
      } else if (state === 'postdata') {
        log('DEBUG', 'Prompting for platform selection for post data');
        const platformResponse = await prompts({
          type: 'select',
          name: 'platform',
          message: 'Prompt 1b: Choose a platform to retrieve post data from:',
          choices: [
            { title: 'Facebook', value: 'facebook' },
            { title: 'Instagram', value: 'instagram' },
            { title: 'Pinterest', value: 'pinterest' },
            { title: 'TikTok', value: 'tiktok' },
            { title: 'Threads', value: 'threads' },
            { title: 'YouTube', value: 'youtube' },
            { title: 'Rumble', value: 'rumble' },
            { title: 'X (Twitter)', value: 'x' },
            { title: 'Back', value: 'back' },
          ],
          initial: 0,
        });

        log('DEBUG', `Platform response: ${JSON.stringify(platformResponse)}`);
        if (!platformResponse.platform) {
          log('INFO', 'No platform selected. Exiting.');
          if (verbose) log('VERBOSE', 'User cancelled platform selection');
          await saveConfig(config);
          process.exit(0);
        }

        if (platformResponse.platform === 'back') {
          state = 'mode';
          if (verbose) log('VERBOSE', 'User chose to go back to main menu');
          continue;
        }

        const platform = platformResponse.platform;

        try {
          config = await promptForConfig(config, platform);
        } catch (error) {
          if (error.message === 'User chose to go back') {
            log('INFO', `User opted to go back from ${platform} config prompt`);
            state = 'mode';
            continue;
          }
          log('ERROR', `Config setup failed for ${platform}: ${error.message}`);
          state = 'mode';
          continue;
        }

        log('DEBUG', `Checking authentication for ${platform}`);
        let token;
        try {
          token = await TOKENS[platform](config);
          log('DEBUG', `Token obtained for ${platform}: ${token.substring(0, 10)}...`);
          if (verbose) log('VERBOSE', `Authentication successful for ${platform}`);
        } catch (error) {
          if (error.message === 'User chose to go back') {
            log('INFO', `User opted to go back from ${platform} auth prompt`);
            if (verbose) log('VERBOSE', 'User cancelled auth prompt');
            state = 'mode';
            continue;
          }
          log('ERROR', `Authentication failed for ${platform}: ${error.message}`);
          if (verbose) log('VERBOSE', `Auth error details: ${error.stack}`);
          state = 'mode';
          continue;
        }

        log('DEBUG', 'Prompting for account details');
        const accountResponse = await prompts([
          {
            type: 'text',
            name: 'account',
            message: `Enter the ${platform} account handle (e.g., @username) or ID (or press Enter to return):`,
            validate: value => value !== undefined ? true : 'Account is required',
          },
          {
            type: 'select',
            name: 'isMyAccount',
            message: 'Is this your account?',
            choices: [
              { title: 'Yes', value: true },
              { title: 'No', value: false },
            ],
            initial: 0,
          },
          {
            type: 'select',
            name: 'metric',
            message: 'Sort posts by which metric?',
            choices: PLATFORM_METRICS[platform].map(m => ({ title: m, value: m })),
            initial: 0,
          },
        ]);

        log('DEBUG', `Account response: ${JSON.stringify(accountResponse)}`);
        if (!accountResponse.account || !('isMyAccount' in accountResponse) || !accountResponse.metric) {
          log('INFO', 'Incomplete account input. Exiting.');
          if (verbose) log('VERBOSE', 'User cancelled account prompt');
          await saveConfig(config);
          process.exit(0);
        }

        if (accountResponse.account === '') {
          state = 'mode';
          if (verbose) log('VERBOSE', 'User pressed Enter to return to main menu');
          continue;
        }

        log('INFO', `Retrieving post data for ${platform} account: ${accountResponse.account}`);
        if (verbose) log('VERBOSE', `Starting post data retrieval for ${platform}, account: ${accountResponse.account}, metric: ${accountResponse.metric}`);
        const csvPath = await POSTS[platform](accountResponse.account, accountResponse.isMyAccount, accountResponse.metric, config, verbose);
        log('INFO', `Post data retrieval completed. Results saved to ${csvPath}`);
        if (verbose) log('VERBOSE', 'Post data retrieval task completed');
        state = 'mode';
      }
    }
  } catch (err) {
    log('ERROR', `Unexpected error or interruption: ${err.message}`);
    if (args.includes('--verbose')) log('VERBOSE', `Error stack: ${err.stack}`);
    try {
      const config = await loadConfig();
      await saveConfig(config);
    } catch (saveErr) {
      log('ERROR', `Failed to save config on exit: ${saveErr.message}`);
    }
    process.exit(1);
  }
})();