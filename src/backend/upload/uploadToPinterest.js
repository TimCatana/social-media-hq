const axios = require('axios');
const fs = require('fs').promises;
const { log } = require('../utils/logUtils');

async function postToPinterest(post) {
  const { imageUrl, caption, hashtags, location, title, boardId, link, altText, originalTime, accessToken, uploadHistoryPath, uploadedLogPath } = post;

  const isVideo = /\.(mp4|mov)$/i.test(imageUrl);
  let success = false;
  let uploadTime = '';

  try {
    const description = `${caption}${hashtags ? ' ' + hashtags : ''}${location ? `\nLocation: ${location}` : ''}`;
    const response = await axios.post(
      'https://api.pinterest.com/v5/pins',
      {
        board_id: boardId,
        title: title || caption || 'Untitled',
        description: description || 'No description',
        media_source: {
          source_type: isVideo ? 'video_url' : 'image_url',
          url: imageUrl,
        },
        link: link || null,
        alt_text: altText || null,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      }
    );

    uploadTime = new Date().toISOString();
    log('INFO', `Pinterest ${isVideo ? 'video' : 'image'} post successful at ${uploadTime}: ${response.data.id}`);
    success = true;
  } catch (error) {
    log('ERROR', `Pinterest ${isVideo ? 'video' : 'image'} post failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
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

module.exports = { postToPinterest };