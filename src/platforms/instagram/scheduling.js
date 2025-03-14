const { parseCsv } = require('../../utils/csvUtils');
const { initializeSchedule } = require('../../utils/scheduleUtils');
const { log } = require('../../utils/logUtils');
const axios = require('axios');

async function uploadToInstagram(post, config, accessToken, verbose = false) {
  const igUserId = config.platforms.instagram.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const mediaUrl = `https://graph.facebook.com/v20.0/${igUserId}/media`;
  const mediaBody = {
    image_url: post['Media URL'],
    caption: `${post.Caption || ''} ${post.Hashtags || ''}`.trim(),
    access_token: accessToken,
  };
  if (verbose) log('VERBOSE', `Sending POST to ${mediaUrl} with body: ${JSON.stringify(mediaBody, null, 2)}`);
  
  let mediaResponse;
  try {
    mediaResponse = await axios.post(mediaUrl, mediaBody);
  } catch (error) {
    const errorDetails = error.response
      ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data, null, 2)}`
      : error.message;
    log('ERROR', `Failed to create Instagram media: ${errorDetails}`);
    if (verbose) log('VERBOSE', `Full media creation error: ${JSON.stringify(error, null, 2)}`);
    throw error;
  }

  const publishUrl = `https://graph.facebook.com/v20.0/${igUserId}/media_publish`;
  const publishBody = {
    creation_id: mediaResponse.data.id,
    access_token: accessToken,
  };
  if (verbose) log('VERBOSE', `Sending POST to ${publishUrl} with body: ${JSON.stringify(publishBody, null, 2)}`);
  
  try {
    const publishResponse = await axios.post(publishUrl, publishBody);
    return publishResponse.data.id;
  } catch (error) {
    const errorDetails = error.response
      ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data, null, 2)}`
      : error.message;
    log('ERROR', `Failed to publish Instagram media: ${errorDetails}`);
    if (verbose) log('VERBOSE', `Full publish error: ${JSON.stringify(error, null, 2)}`);
    throw error;
  }
}

async function scheduleInstagramPosts(csvPath, config, verbose = false) {
  const posts = await parseCsv(csvPath);
  return await initializeSchedule(csvPath, posts, 'instagram', verbose);
}

module.exports = { uploadToInstagram, scheduleInstagramPosts };