const axios = require('axios');
const fs = require('fs').promises;
const { log } = require('../logging/logUtils');

async function postToTikTok(post) {
  const { imageUrl, caption, hashtags, originalTime, accessToken, uploadHistoryPath, uploadedLogPath } = post;

  if (!/\.(mp4|mov)$/i.test(imageUrl)) {
    log('ERROR', 'TikTok only supports video uploads (.mp4, .mov)');
    return;
  }

  let success = false;
  let uploadTime = '';

  try {
    const response = await axios.post(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        source_info: { source: 'FILE_UPLOAD', video_url: imageUrl },
        post_info: {
          title: caption,
          description: `${hashtags ? hashtags : ''}`,
          disable_comment: false,
          disable_duet: false,
          disable_stitch: false,
          privacy_level: 'PUBLIC_TO_EVERYONE',
        },
      },
      {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      }
    );

    uploadTime = new Date().toISOString();
    log('INFO', `TikTok video post successful at ${uploadTime}: ${response.data.data.publish_id}`);
    success = true;
  } catch (error) {
    log('ERROR', `TikTok video post failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }

  const logEntry = `${originalTime.toISOString()}\t${imageUrl}\t${caption}\t${hashtags || ''}\t${''}\t${success ? 'Yes' : 'No'}\t${uploadTime || ''}\n`;
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

module.exports = { postToTikTok };