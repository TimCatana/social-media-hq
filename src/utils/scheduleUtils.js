const { DateTime } = require('luxon');
const { log } = require('./logUtils');
const fs = require('fs').promises;
const path = require('path');

const SCHEDULED_DIR = path.join(__dirname, '..', '..', 'bin', 'scheduled');

async function initializeSchedule(csvPath, posts, platform, verbose = false) {
  const csvName = path.basename(csvPath, '.csv');
  const jsonPath = path.join(SCHEDULED_DIR, `${csvName}.json`);
  let scheduleData;

  log('INFO', `Initializing schedule for ${csvPath}`);
  try {
    scheduleData = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    log('INFO', `Resuming from existing ${jsonPath}`);

    const allUploaded = scheduleData.posts.every(post => post.status === 'success');
    if (allUploaded) {
      log('INFO', `All posts in ${csvPath} have already been uploaded`);
      throw new Error(`All posts already uploaded for ${csvName}`);
    }

    const scheduledDates = scheduleData.posts
      .filter(p => p.status === 'success')
      .map(p => DateTime.fromISO(p['Publish Date']));
    const lastDate = scheduledDates.length ? DateTime.max(...scheduledDates) : DateTime.now();

    // Reschedule failed posts from previous runs
    for (const post of scheduleData.posts) {
      if (post.status === 'failed') {
        const originalDate = DateTime.fromISO(post['Publish Date']);
        const daysSince = Math.ceil(DateTime.now().diff(originalDate, 'days').days) || 1; // At least 1 day
        const newDate = lastDate.plus({ days: daysSince });
        post['Publish Date'] = newDate.toFormat("yyyy-MM-dd'T'HH:mm:ss");
        post.status = 'pending';
        post.attempts = 0;
        log('INFO', `Rescheduled failed post from ${originalDate.toISO()} to ${newDate.toISO()}`);
      }
    }
  } catch (error) {
    if (error.message.includes('All posts already uploaded')) {
      throw error;
    }

    scheduleData = {
      csvPath,
      platform,
      posts: posts.map(post => ({ ...post, status: 'pending', attempts: 0 })),
      lastScheduledDate: null,
      logs: [],
    };
    const hasPastDates = posts.some(post => DateTime.fromISO(post['Publish Date']) < DateTime.now());
    if (hasPastDates) {
      log('ERROR', `First run of ${csvPath} contains past dates; all dates must be in the future`);
      throw new Error('Past dates detected on first run');
    }
    log('INFO', `Created new schedule for ${csvPath}`);
  }

  await fs.mkdir(SCHEDULED_DIR, { recursive: true });
  await fs.writeFile(jsonPath, JSON.stringify(scheduleData, null, 2));
  log('INFO', `Scheduled ${scheduleData.posts.length} posts in ${jsonPath}`);
  return scheduleData;
}

async function startScheduler(config, verbose = false) {
  log('INFO', 'Starting persistent scheduler...');

  const uploadFunctions = {
    facebook: require('../platforms/facebook/scheduling').uploadToFacebook,
    instagram: require('../platforms/instagram/scheduling').uploadToInstagram,
    pinterest: require('../platforms/pinterest/scheduling').uploadToPinterest,
    rumble: require('../platforms/rumble/scheduling').uploadToRumble,
    threads: require('../platforms/threads/scheduling').uploadToThreads,
    tiktok: require('../platforms/tiktok/scheduling').uploadToTikTok,
    twitter: require('../platforms/twitter/scheduling').uploadToTwitter,
    youtube: require('../platforms/youtube/scheduling').uploadToYouTube,
  };

  const tokens = {};
  const getToken = async platform => {
    if (!tokens[platform]) {
      const authModule = require(`../auth/${platform === 'threads' ? 'instagram' : platform}`);
      tokens[platform] = await (platform === 'threads' ? authModule.getThreadsToken(config) : authModule[`get${platform.charAt(0).toUpperCase() + platform.slice(1)}Token`](config));
    }
    return tokens[platform];
  };

  const files = await fs.readdir(SCHEDULED_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    log('INFO', 'No schedules to process');
    return;
  }

  return new Promise(resolve => {
    const interval = setInterval(async () => {
      try {
        let allPostsDone = true;

        for (const jsonFile of jsonFiles) {
          const jsonPath = path.join(SCHEDULED_DIR, jsonFile);
          let scheduleData = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
          const { platform, posts } = scheduleData;
          const uploadFn = uploadFunctions[platform];

          if (!uploadFn) {
            log('ERROR', `No upload function for platform ${platform}`);
            continue;
          }

          let updated = false;
          for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            if (post.status !== 'pending') continue;

            allPostsDone = false;
            const publishDate = DateTime.fromISO(post['Publish Date']);
            const now = DateTime.now();
            const timeDiff = publishDate.diff(now, 'minutes').minutes;

            if (timeDiff <= 0 && timeDiff >= -1) { // At or past scheduled time, up to 1 minute late
              try {
                log('INFO', `Uploading ${platform} post ${i + 1}/${posts.length} scheduled for ${post['Publish Date']}`);
                const accessToken = await getToken(platform);
                const result = await uploadFn(post, config, accessToken, verbose);
                post.status = 'success';
                post.result = result;
                post.attempts = (post.attempts || 0) + 1;
                scheduleData.lastScheduledDate = post['Publish Date'];
                const successMsg = `Successfully uploaded ${platform} post ${result} for ${post['Publish Date']}`;
                log('INFO', successMsg);
                scheduleData.logs.push({ timestamp: now.toISO(), level: 'INFO', message: successMsg });
                updated = true;
              } catch (error) {
                post.status = 'failed';
                post.attempts = (post.attempts || 0) + 1;
                const errorDetails = error.response
                  ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data, null, 2)}`
                  : error.message;
                log('ERROR', `Failed to upload ${platform} post ${i + 1}/${posts.length} for ${post['Publish Date']}: ${errorDetails}`);
                if (verbose) log('VERBOSE', `Full error details: ${JSON.stringify(error, null, 2)}`);
                scheduleData.logs.push({ timestamp: now.toISO(), level: 'ERROR', message: errorDetails });
                updated = true;
                // Do not reschedule here; leave as failed
              }
            }
          }

          if (updated) {
            await fs.writeFile(jsonPath, JSON.stringify(scheduleData, null, 2));
            log('INFO', `Updated schedule data in ${jsonFile}`);
          }
        }

        if (allPostsDone && jsonFiles.length > 0) {
          log('INFO', 'All scheduled posts have been attempted; returning to main menu');
          clearInterval(interval);
          resolve();
        }
      } catch (error) {
        const errorDetails = error.response
          ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data, null, 2)}`
          : error.message;
        log('ERROR', `Scheduler error: ${errorDetails}`);
        if (verbose) log('VERBOSE', `Full scheduler error details: ${JSON.stringify(error, null, 2)}`);
      }
    }, 60000); // Check every minute
  });
}

module.exports = { initializeSchedule, startScheduler };