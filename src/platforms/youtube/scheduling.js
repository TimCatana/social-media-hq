const { parseCsv } = require('../../utils/csvUtils');
const { initializeSchedule } = require('../../utils/scheduleUtils');
const { log } = require('../../utils/logUtils');
const { getYouTubeToken } = require('../../auth/youtube');
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

  if (verbose) {
    log('VERBOSE', `Sending POST to ${url} with data: ${JSON.stringify(data, null, 2)}`);
    log('VERBOSE', `Headers: ${JSON.stringify({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, null, 2)}`);
  }

  const response = await axios.post(url, data, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  return response.data.id;
}

async function scheduleYouTubePosts(csvPath, config, verbose = false) {
  const posts = await parseCsv(csvPath);
  return await initializeSchedule(csvPath, posts, 'youtube', verbose);
}

module.exports = { uploadToYouTube, scheduleYouTubePosts };