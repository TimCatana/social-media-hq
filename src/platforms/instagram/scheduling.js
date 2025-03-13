const { parseCsv } = require('../../utils/csvUtils');
const { initializeSchedule } = require('../../utils/scheduleUtils');
const { log } = require('../../utils/logUtils');
const { getInstagramToken } = require('../../auth/instagram');
const axios = require('axios');

async function uploadToInstagram(post, config, accessToken, verbose = false) {
  const igUserId = config.platforms.instagram?.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!igUserId) throw new Error('Instagram Business Account ID not configured');

  const mediaUrl = `https://graph.facebook.com/v20.0/${igUserId}/media`;
  const mediaParams = {
    image_url: post['Media URL'],
    caption: `${post.Caption || ''} ${post.Hashtags || ''}`.trim(),
    access_token: accessToken,
  };

  if (verbose) {
    log('VERBOSE', `Sending POST to ${mediaUrl} with params: ${JSON.stringify(mediaParams, null, 2)}`);
  }

  const mediaResponse = await axios.post(mediaUrl, null, { params: mediaParams });

  const publishUrl = `https://graph.facebook.com/v20.0/${igUserId}/media_publish`;
  const publishParams = { creation_id: mediaResponse.data.id, access_token: accessToken };

  if (verbose) {
    log('VERBOSE', `Sending POST to ${publishUrl} with params: ${JSON.stringify(publishParams, null, 2)}`);
  }

  const publishResponse = await axios.post(publishUrl, null, { params: publishParams });

  return publishResponse.data.id;
}

async function scheduleInstagramPosts(csvPath, config, verbose = false) {
  const posts = await parseCsv(csvPath);
  return await initializeSchedule(csvPath, posts, 'instagram', verbose);
}

module.exports = { uploadToInstagram, scheduleInstagramPosts };