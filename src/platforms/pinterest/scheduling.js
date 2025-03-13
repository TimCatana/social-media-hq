const { parseCsv } = require('../../utils/csvUtils');
const { initializeSchedule } = require('../../utils/scheduleUtils');
const { log } = require('../../utils/logUtils');
const { getPinterestToken } = require('../../auth/pinterest');
const axios = require('axios');

async function uploadToPinterest(post, config, accessToken, verbose = false) {
  const url = 'https://api.pinterest.com/v5/pins';
  const data = {
    title: post.Title || '',
    description: `${post.Caption || ''} ${post.Hashtags || ''}`.trim(),
    link: post['External Link'] || '',
    board_id: post['Board ID'] || config.platforms.pinterest?.DEFAULT_BOARD_ID,
    media_source: { source_type: 'image_url', url: post['Media URL'] },
    alt_text: post['Alt Text'] || '',
  };
  if (!data.board_id) throw new Error('Board ID not provided in CSV or config');

  if (verbose) {
    log('VERBOSE', `Sending POST to ${url} with data: ${JSON.stringify(data, null, 2)}`);
    log('VERBOSE', `Headers: ${JSON.stringify({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, null, 2)}`);
  }

  const response = await axios.post(url, data, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  return response.data.id;
}

async function schedulePinterestPosts(csvPath, config, verbose = false) {
  const posts = await parseCsv(csvPath);
  return await initializeSchedule(csvPath, posts, 'pinterest', verbose);
}

module.exports = { uploadToPinterest, schedulePinterestPosts };