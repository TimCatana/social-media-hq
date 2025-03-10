const axios = require('axios');
const fs = require('fs');

async function postToYouTube(post) {
  const { imageUrl, caption, hashtags, location, originalTime, accessToken, uploadHistoryPath, uploadedLogPath } = post;

  let success = false;
  let uploadTime = '';
  try {
    // Note: YouTube expects video uploads; this uses imageUrl for simplicity
    const response = await axios.post(
      'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status',
      {
        snippet: {
          title: caption,
          description: `${hashtags ? hashtags : ''}${location ? ` ${location}` : ''}`,
          tags: hashtags ? hashtags.split(' ') : [],
          categoryId: '22', // People & Blogs (example category)
        },
        status: {
          privacyStatus: 'public',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: imageUrl, // In reality, this would be a video file upload
      }
    );

    uploadTime = new Date().toISOString();
    console.log(`YouTube post successful at ${uploadTime}`);
    success = true;
  } catch (error) {
    console.error(`YouTube post failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
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

module.exports = { postToYouTube };