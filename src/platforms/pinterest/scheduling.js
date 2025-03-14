const { parseCsv } = require('../../utils/csvUtils');
const { initializeSchedule } = require('../../utils/scheduleUtils');
const { log } = require('../../utils/logUtils');
const axios = require('axios');

async function uploadToPinterest(post, config, accessToken, verbose = false) {
  const url = 'https://api.pinterest.com/v5/pins';
  const data = {
    title: post.Title || '',
    description: `${post.Caption || ''} ${post.Hashtags || ''}`.trim(),
    link: post['External Link'] || '',
    board_id: post['Board ID'] || config.platforms.pinterest.DEFAULT_BOARD_ID,
    media_source: { source_type: 'image_url', url: post['Media URL'] },
    alt_text: post['Alt Text'] || '',
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
    log('ERROR', `Failed to upload Pinterest pin: ${errorDetails}`);
    if (verbose) log('VERBOSE', `Full upload error: ${JSON.stringify(error, null, 2)}`);
    throw error;
  }
}

async function schedulePinterestPosts(csvPath, config, verbose = false) {
  const posts = await parseCsv(csvPath);
  return await initializeSchedule(csvPath, posts, 'pinterest', verbose);
}

module.exports = { uploadToPinterest, schedulePinterestPosts };