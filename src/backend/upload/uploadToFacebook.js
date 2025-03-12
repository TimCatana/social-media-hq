const axios = require('axios');
const fs = require('fs').promises;
const { log } = require('../utils/logUtils');

async function postToFacebook(post) {
  const { imageUrl, caption, hashtags, location, originalTime, accessToken, uploadHistoryPath, uploadedLogPath, config } = post;
  const pageId = config.platforms.facebook.PAGE_ID;

  const isVideo = /\.(mp4|mov)$/i.test(imageUrl);
  let success = false;
  let uploadTime = '';

  try {
    const params = {
      access_token: accessToken,
      message: `${caption}${hashtags ? ' ' + hashtags : ''}${location ? `\nLocation: ${location}` : ''}`,
    };
    const url = isVideo 
      ? `https://graph-video.facebook.com/v20.0/${pageId}/videos`
      : `https://graph.facebook.com/v20.0/${pageId}/photos`;
    params[isVideo ? 'file_url' : 'url'] = imageUrl;

    const response = await axios.post(url, params);
    uploadTime = new Date().toISOString();
    log('INFO', `Facebook ${isVideo ? 'video' : 'image'} post successful at ${uploadTime}: ${response.data.id}`);
    success = true;
  } catch (error) {
    log('ERROR', `Facebook ${isVideo ? 'video' : 'image'} post failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
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

module.exports = { postToFacebook };