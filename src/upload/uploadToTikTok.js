const axios = require('axios');
const fs = require('fs');

async function postToTikTok(post) {
  const { imageUrl, caption, hashtags, originalTime, accessToken, uploadHistoryPath, uploadedLogPath } = post;

  let success = false;
  let uploadTime = '';
  try {
    const response = await axios.post(
      'https://open.tiktokapis.com/v2/video/upload/',
      {
        source_info: {
          source: 'URL',
          video_url: imageUrl // Assuming imageUrl is a video for TikTok
        },
        post_info: {
          description: `${caption}${hashtags ? ' ' + hashtags : ''}`,
          disable_comment: false,
          disable_duet: false,
          disable_stitch: false,
          privacy_level: 'PUBLIC_TO_EVERYONE'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    uploadTime = new Date().toISOString();
    console.log(`TikTok post successful at ${uploadTime}: ${response.data.data.video_id}`);
    success = true;
  } catch (error) {
    console.error(`TikTok post failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }

  const logEntry = `${originalTime.toISOString()}\t${imageUrl}\t${caption}\t${hashtags}\t${''}\t${success ? 'Yes' : 'No'}\t${success ? uploadTime : ''}\n`;
  if (!fs.existsSync(uploadHistoryPath)) {
    fs.writeFileSync(uploadHistoryPath, 'Publish Date\tMedia URL\tCaption\tHashtags\tLocation\tUpload Success\tUpload Time\n');
  }
  fs.appendFileSync(uploadHistoryPath, logEntry);

  if (success) {
    fs.appendFileSync(uploadedLogPath, `${originalTime.toISOString()}\n`);
  }
}

module.exports = { postToTikTok };