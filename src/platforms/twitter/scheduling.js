const { parseCsv } = require('../../utils/csvUtils');
const { initializeSchedule } = require('../../utils/scheduleUtils');
const { log } = require('../../utils/logUtils');
const axios = require('axios');

async function uploadToTwitter(post, config, accessToken, verbose = false) {
  const url = 'https://api.twitter.com/2/tweets';
  const data = {
    text: `${post.Caption || ''} ${post.Hashtags || ''}`.trim(),
    media: post['Media URL'] ? { media_urls: [post['Media URL']] } : undefined,
  };
  if (verbose) log('VERBOSE', `Sending POST to ${url} with body: ${JSON.stringify(data, null, 2)}`);
  
  try {
    const response = await axios.post(url, data, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    return response.data.data.id;
  } catch (error) {
    const errorDetails = error.response
      ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data, null, 2)}`
      : error.message;
    log('ERROR', `Failed to upload Twitter tweet: ${errorDetails}`);
    if (verbose) log('VERBOSE', `Full upload error: ${JSON.stringify(error, null, 2)}`);
    throw error;
  }
}

async function scheduleTwitterPosts(csvPath, config, verbose = false) {
  const posts = await parseCsv(csvPath);
  return await initializeSchedule(csvPath, posts, 'twitter', verbose);
}

module.exports = { uploadToTwitter, scheduleTwitterPosts };