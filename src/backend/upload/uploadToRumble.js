const axios = require('axios');
const fs = require('fs').promises;
const { log } = require('../logging/logUtils');

async function postToRumble(post) {
  const { imageUrl, caption, hashtags, location, duration, originalTime, accessToken, uploadHistoryPath, uploadedLogPath } = post;

  if (!/\.(mp4|mov)$/i.test(imageUrl)) {
    log('ERROR', 'Rumble only supports video uploads (.mp4, .mov)');
    return;
  }

  let success = false;
  let uploadTime = '';

  try {
    // Hypothetical Rumble API (no public API as of March 2025)
    const response = await axios.post(
      'https://api.rumble.com/v1/videos/upload', // Placeholder
      {
        title: caption,
        description: `${hashtags ? hashtags + ' ' : ''}${location ? location : ''}`,
        video_url: imageUrl,
        is_short: duration > 0 && duration <= 60,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      }
    );

    uploadTime = new Date().toISOString();
    log('INFO', `Rumble video post successful at ${uploadTime}: ${response.data.id}`);
    success = true;
  } catch (error) {
    log('ERROR', `Rumble video post failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
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

module.exports = { postToRumble };