const axios = require('axios');
const fs = require('fs');

async function postToRumble(post) {
  const { imageUrl, caption, hashtags, location, originalTime, accessToken, uploadHistoryPath, uploadedLogPath } = post;

  let success = false;
  let uploadTime = '';
  try {
    // Hypothetical Rumble API (no public API exists as of March 2025)
    const response = await axios.post(
      'https://api.rumble.com/v1/videos', // Hypothetical endpoint
      {
        title: caption,
        description: `${hashtags ? hashtags : ''}${location ? ` ${location}` : ''}`,
        url: imageUrl, // Assuming image URL for simplicity
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    uploadTime = new Date().toISOString();
    console.log(`Rumble post successful at ${uploadTime}`);
    success = true;
  } catch (error) {
    console.error(`Rumble post failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
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

module.exports = { postToRumble };