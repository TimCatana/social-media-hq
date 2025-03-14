const { parseCsv } = require('../../utils/csvUtils');
const { initializeSchedule } = require('../../utils/scheduleUtils');
const { log } = require('../../utils/logUtils');
const axios = require('axios');

async function uploadToYouTube(post, config, accessToken, verbose = false) {
  const url = 'https://www.googleapis.com/youtube/v3/videos';
  const data = {
    snippet: {
      title: post.Title || '',
      description: `${post.Description || ''} ${post.Tags || ''}`.trim(),
    },
    status: { privacyStatus: 'public' },
    media: { url: post['Media URL'] },
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
    log('ERROR', `Failed to upload YouTube video: ${errorDetails}`);
    if (verbose) log('VERBOSE', `Full upload error: ${JSON.stringify(error, null, 2)}`);
    throw error;
  }
}

async function scheduleYouTubePosts(csvPath, config, verbose = false) {
  const posts = await parseCsv(csvPath);
  return await initializeSchedule(csvPath, posts, 'youtube', verbose);
}

module.exports = { uploadToYouTube, scheduleYouTubePosts };