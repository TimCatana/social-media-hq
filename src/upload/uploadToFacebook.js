const axios = require('axios');
const fs = require('fs');

async function postToFacebook(post) {
  const { imageUrl, caption, hashtags, location, originalTime, accessToken, uploadHistoryPath, uploadedLogPath } = post;
  const pageId = process.env.PAGE_ID;

  let success = false;
  let uploadTime = '';
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${pageId}/photos`,
      {
        message: `${caption}${hashtags ? ' ' + hashtags : ''}${location ? `\nLocation: ${location}` : ''}`,
        url: imageUrl,
        access_token: accessToken,
        published: true
      }
    );

    uploadTime = new Date().toISOString();
    console.log(`Facebook post successful at ${uploadTime}`);
    success = true;
  } catch (error) {
    console.error(`Facebook post failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }

  const logEntry = `${originalTime.toISOString()}\t${imageUrl}\t${caption}\t${hashtags}\t${location}\t${success ? 'Yes' : 'No'}\t${success ? uploadTime : ''}\n`;
  if (!fs.existsSync(uploadHistoryPath)) {
    fs.writeFileSync(uploadHistoryPath, 'Publish Date\tMedia URL\tCaption\tHashtags\tLocation\tUpload Success\tUpload Time\n');
  }
  fs.appendFileSync(uploadHistoryPath, logEntry);

  if (success) {
    fs.appendFileSync(uploadedLogPath, `${originalTime.toISOString()}\n`);
  }
}

module.exports = { postToFacebook };