const axios = require('axios');
const fs = require('fs');

async function postToThreads(post) {
  const { imageUrl, caption, hashtags, location, originalTime, accessToken, uploadHistoryPath, uploadedLogPath } = post;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  let success = false;
  let uploadTime = '';
  try {
    const mediaResponse = await axios.post(
      `https://graph.threads.net/v1.0/${igUserId}/threads`,
      {
        media_type: 'IMAGE',
        image_url: imageUrl,
        text: `${caption}${hashtags ? ' ' + hashtags : ''}${location ? ` ${location}` : ''}`,
        access_token: accessToken,
      }
    );
    const mediaId = mediaResponse.data.id;

    const publishResponse = await axios.post(
      `https://graph.threads.net/v1.0/${igUserId}/threads_publish`,
      {
        creation_id: mediaId,
        access_token: accessToken,
      }
    );

    uploadTime = new Date().toISOString();
    console.log(`Threads post successful at ${uploadTime}`);
    success = true;
  } catch (error) {
    console.error(`Threads post failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
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

module.exports = { postToThreads };