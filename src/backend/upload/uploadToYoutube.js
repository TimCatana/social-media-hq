const axios = require('axios');
const fs = require('fs').promises;
const { log } = require('../logging/logUtils');

async function postToYouTube(post) {
  const { imageUrl, caption, hashtags, location, duration, originalTime, accessToken, uploadHistoryPath, uploadedLogPath } = post;

  if (!/\.(mp4|mov)$/i.test(imageUrl)) {
    log('ERROR', 'YouTube only supports video uploads (.mp4, .mov)');
    return;
  }

  let success = false;
  let uploadTime = '';

  try {
    const videoData = await axios.get(imageUrl, { responseType: 'arraybuffer' }).then(res => res.data);
    const uploadResponse = await axios.post(
      'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status',
      videoData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'video/mp4',
        },
        params: {
          uploadType: 'media',
        },
      }
    );

    const videoId = uploadResponse.data.id;
    await axios.post(
      'https://www.googleapis.com/youtube/v3/videos?part=snippet,status',
      {
        id: videoId,
        snippet: {
          title: caption || 'Untitled',
          description: `${hashtags ? hashtags + ' ' : ''}${location || ''}`,
          tags: hashtags ? hashtags.split(/\s+/) : [],
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'public',
          embeddable: true,
          license: 'youtube',
          selfDeclaredMadeForKids: false,
        },
      },
      {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      }
    );

    uploadTime = new Date().toISOString();
    log('INFO', `YouTube video post successful at ${uploadTime}: ${videoId}`);
    success = true;
  } catch (error) {
    log('ERROR', `YouTube video post failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
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

module.exports = { postToYouTube };