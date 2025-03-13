const { parseCsv } = require('../../utils/csvUtils');
const { initializeSchedule } = require('../../utils/scheduleUtils');
const { log } = require('../../utils/logUtils');
const { getTwitterToken } = require('../../auth/twitter');
const axios = require('axios');

async function uploadToTwitter(post, config, accessToken, verbose = false) {
  const url = 'https://api.twitter.com/2/tweets';
  const data = {
    text: `${post.Caption || ''} ${post.Hashtags || ''}`.trim(),
    media: post['Media URL'] ? { media_urls: [post['Media URL']] } : undefined,
  };

  if (verbose) {
    log('VERBOSE', `Sending POST to ${url} with data: ${JSON.stringify(data, null, 2)}`);
    log('VERBOSE', `Headers: ${JSON.stringify({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, null, 2)}`);
  }

  const response = await axios.post(url, data, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  return response.data.data.id;
}

async function scheduleTwitterPosts(csvPath, config, verbose = false) {
  const posts = await parseCsv(csvPath);
  return await initializeSchedule(csvPath, posts, 'twitter', verbose);
}

module.exports = { uploadToTwitter, scheduleTwitterPosts };