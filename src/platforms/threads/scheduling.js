const { parseCsv } = require('../../utils/csvUtils');
const { initializeSchedule } = require('../../utils/scheduleUtils');
const { log } = require('../../utils/logUtils');
const axios = require('axios');

async function uploadToThreads(post, config, accessToken, verbose = false) {
  const userId = config.platforms.threads.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const url = `https://graph.threads.net/v1.0/${userId}/threads`;
  const data = {
    media_url: post['Media URL'],
    text: `${post.Caption || ''} ${post.Hashtags || ''}`.trim(),
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
    log('ERROR', `Failed to upload Threads post: ${errorDetails}`);
    if (verbose) log('VERBOSE', `Full upload error: ${JSON.stringify(error, null, 2)}`);
    throw error;
  }
}

async function scheduleThreadsPosts(csvPath, config, verbose = false) {
  const posts = await parseCsv(csvPath);
  return await initializeSchedule(csvPath, posts, 'threads', verbose);
}

module.exports = { uploadToThreads, scheduleThreadsPosts };