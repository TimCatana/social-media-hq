const axios = require('axios');
const fs = require('fs').promises;
const { log } = require('../logging/logUtils');

async function postToTwitter(post) {
  const { imageUrl, caption, hashtags, location, originalTime, accessToken, uploadHistoryPath, uploadedLogPath } = post;

  const isVideo = /\.(mp4|mov)$/i.test(imageUrl);
  let success = false;
  let uploadTime = '';

  try {
    let mediaId = null;
    if (imageUrl) {
      const mediaData = await axios.get(imageUrl, { responseType: 'arraybuffer' }).then(res => Buffer.from(res.data));
      const uploadUrl = isVideo 
        ? 'https://upload.twitter.com/1.1/media/upload.json?media_category=tweet_video'
        : 'https://upload.twitter.com/1.1/media/upload.json';

      const uploadResponse = await axios.post(uploadUrl, mediaData, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/octet-stream' },
      });
      mediaId = uploadResponse.data.media_id_string;
      log('INFO', `Twitter ${isVideo ? 'video' : 'image'} uploaded: ${mediaId}`);
    }

    const tweetText = `${caption}${hashtags ? ' ' + hashtags : ''}${location ? ` ${location}` : ''}`.trim();
    const tweetData = { text: tweetText };
    if (mediaId) tweetData.media = { media_ids: [mediaId] };

    const tweetResponse = await axios.post('https://api.twitter.com/2/tweets', tweetData, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });

    uploadTime = new Date().toISOString();
    log('INFO', `Twitter ${isVideo ? 'video' : 'image'} post successful at ${uploadTime}: ${tweetResponse.data.data.id}`);
    success = true;
  } catch (error) {
    log('ERROR', `Twitter ${isVideo ? 'video' : 'image'} post failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }

  const logEntry = `${originalTime.toISOString()}\t${imageUrl || ''}\t${caption}\t${hashtags || ''}\t${location || ''}\t${success ? 'Yes' : 'No'}\t${uploadTime || ''}\n`;
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

module.exports = { postToTwitter };