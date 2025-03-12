const axios = require('axios');
const fs = require('fs').promises;
const { log } = require('../utils/logUtils');

async function postToThreads(post) {
  const { imageUrl, caption, hashtags, location, originalTime, accessToken, uploadHistoryPath, uploadedLogPath, config } = post;
  const userId = config.platforms.threads.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  const isVideo = /\.(mp4|mov)$/i.test(imageUrl);
  let success = false;
  let uploadTime = '';

  try {
    const mediaResponse = await axios.post(
      `https://graph.threads.net/v1.0/${userId}/threads`,
      {
        media_type: isVideo ? 'VIDEO' : 'IMAGE',
        [isVideo ? 'video_url' : 'image_url']: imageUrl,
        text: `${caption}${hashtags ? ' ' + hashtags : ''}${location ? ` ${location}` : ''}`,
        access_token: accessToken,
      }
    );
    const mediaId = mediaResponse.data.id;

    const publishResponse = await axios.post(
      `https://graph.threads.net/v1.0/${userId}/threads_publish`,
      { creation_id: mediaId, access_token: accessToken }
    );

    uploadTime = new Date().toISOString();
    log('INFO', `Threads ${isVideo ? 'video' : 'image'} post successful at ${uploadTime}: ${publishResponse.data.id}`);
    success = true;
  } catch (error) {
    log('ERROR', `Threads ${isVideo ? 'video' : 'image'} post failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }

  const logEntry = `${originalTime.toISOString()}\t${imageUrl}\t${caption}\t${hashtags || ''}\t${location || ''}\t${success ? 'Yes' : 'No'}\t${uploadTime || ''}\n`;
  await appendLog(uploadHistoryPath, uploadedLogPath, logEntry, success, originalTime);
}

async function appendLog(historyPath, logPath, entry, success, originalTime) {
  try {
    await fs.access(historyPath).catch(() => fs.writeFile(historyPath, 'Publish Date\tMedia URL\tCaption\tHashtags\tLocation\tUpload Success\tUpload Time\n'));
    await fs.appendFile(historyPath, entry);
    if (success) await fs.appendFile(logPath, `${originalTime.toISOString()}\n`);
  } catch (err) {
    log('ERROR', `Failed to write log: ${err.message}`);
  }
}

module.exports = { postToThreads };