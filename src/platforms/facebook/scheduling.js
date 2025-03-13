const { parseCsv } = require('../../utils/csvUtils');
const { initializeSchedule } = require('../../utils/scheduleUtils');
const { log } = require('../../utils/logUtils');
const { getFacebookToken } = require('../../auth/facebook');
const axios = require('axios');

async function uploadToFacebook(post, config, accessToken, verbose = false) {
  const pageId = config.platforms.facebook?.PAGE_ID || 'me';
  if (!pageId) throw new Error('Facebook Page ID not configured in config.platforms.facebook.PAGE_ID');
  const url = `https://graph.facebook.com/v20.0/${pageId}/photos`;
  const params = {
    url: post['Media URL'],
    caption: `${post.Caption || ''} ${post.Hashtags || ''}`.trim(),
    access_token: accessToken,
  };

  if (verbose) {
    log('VERBOSE', `Sending POST to ${url} with params: ${JSON.stringify(params, null, 2)}`);
  }

  const response = await axios.post(url, null, { params });
  return response.data.id;
}

async function scheduleFacebookPosts(csvPath, config, verbose = false) {
  const posts = await parseCsv(csvPath);
  return await initializeSchedule(csvPath, posts, 'facebook', verbose);
}

module.exports = { uploadToFacebook, scheduleFacebookPosts };