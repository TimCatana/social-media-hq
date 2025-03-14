const { parseCsv } = require('../../utils/csvUtils');
const { initializeSchedule } = require('../../utils/scheduleUtils');
const { log } = require('../../utils/logUtils');
const axios = require('axios');

async function uploadToRumble(post, config, accessToken, verbose = false) {
  const url = 'https://api.rumble.com/v1/video/upload'; // Hypothetical endpoint
  const data = {
    video_url: post['Media URL'],
    title: post.Caption || '',
    description: `${post.Hashtags || ''} ${post.Location || ''}`.trim(),
    duration: parseInt(post['Duration (seconds)'] || '0'),
  };
  if (verbose) log('VERBOSE', `Sending POST to ${url} with body: ${JSON.stringify(data, null, 2)}`);
  
  try {
    const response = await axios.post(url, data, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    return response.data.id;
  } catch (error) {
    const errorDetails = error.response
      ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data, null, 2)}`
      : error.message;
    log('ERROR', `Failed to upload Rumble video: ${errorDetails}`);
    if (verbose) log('VERBOSE', `Full upload error: ${JSON.stringify(error, null, 2)}`);
    throw error;
  }
}

async function scheduleRumblePosts(csvPath, config, verbose = false) {
  const posts = await parseCsv(csvPath);
  return await initializeSchedule(csvPath, posts, 'rumble', verbose);
}

module.exports = { uploadToRumble, scheduleRumblePosts };