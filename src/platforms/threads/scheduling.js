const { parseCsv } = require('../../utils/csvUtils');
const { initializeSchedule } = require('../../utils/scheduleUtils');
const { log } = require('../../utils/logUtils');
const { getThreadsToken } = require('../../auth/instagram');
const axios = require('axios');

async function uploadToThreads(post, config, accessToken, verbose = false) {
  const userId = config.platforms.threads?.INSTAGRAM_BUSINESS_ACCOUNT_ID || config.platforms.instagram?.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!userId) throw new Error('Threads/Instagram Business Account ID not configured');
  const url = `https://graph.threads.net/v1.0/${userId}/threads`;
  const data = {
    media_url: post['Media URL'],
    text: `${post.Caption || ''} ${post.Hashtags || ''}`.trim(),
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

async function scheduleThreadsPosts(csvPath, config, verbose = false) {
  const posts = await parseCsv(csvPath);
  return await initializeSchedule(csvPath, posts, 'threads', verbose);
}

module.exports = { uploadToThreads, scheduleThreadsPosts };