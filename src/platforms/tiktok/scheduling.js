const { parseCsv } = require('../../utils/csvUtils');
const { initializeSchedule } = require('../../utils/scheduleUtils');
const { log } = require('../../utils/logUtils');
const { getTikTokToken } = require('../../auth/tiktok');
const axios = require('axios');

async function uploadToTikTok(post, config, accessToken, verbose = false) {
  const url = 'https://open.tiktokapis.com/v2/post/publish/video/';
  const data = {
    video_url: post['Media URL'],
    caption: `${post.Caption || ''} ${post.Hashtags || ''}`.trim(),
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

async function scheduleTikTokPosts(csvPath, config, verbose = false) {
  const posts = await parseCsv(csvPath);
  return await initializeSchedule(csvPath, posts, 'tiktok', verbose);
}

module.exports = { uploadToTikTok, scheduleTikTokPosts };