const { parseCsv } = require('../../utils/csvUtils');
const { initializeSchedule } = require('../../utils/scheduleUtils');
const { log } = require('../../utils/logUtils');
const { getRumbleToken } = require('../../auth/rumble');
const axios = require('axios');

async function uploadToRumble(post, config, accessToken, verbose = false) {
  const url = 'https://api.rumble.com/v1/video/upload'; // Hypothetical
  const data = {
    video_url: post['Media URL'],
    title: post.Caption || '',
    description: `${post.Hashtags || ''} ${post.Location || ''}`.trim(),
    duration: parseInt(post['Duration (seconds)'] || '0'),
  };

  if (verbose) {
    log('VERBOSE', `Sending POST to ${url} with data: ${JSON.stringify(data, null, 2)}`);
    log('VERBOSE', `Headers: ${JSON.stringify({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, null, 2)}`);
  }

  const response = await axios.post(url, data, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  return response.data.id;
}

async function scheduleRumblePosts(csvPath, config, verbose = false) {
  const posts = await parseCsv(csvPath);
  return await initializeSchedule(csvPath, posts, 'rumble', verbose);
}

module.exports = { uploadToRumble, scheduleRumblePosts };