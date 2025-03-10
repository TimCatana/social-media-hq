const axios = require('axios');
const fs = require('fs');

async function postToTwitter(post) {
  const { imageUrl, caption, hashtags, location, originalTime, accessToken, uploadHistoryPath, uploadedLogPath } = post;

  let success = false;
  let uploadTime = '';

  try {
    let mediaId = null;

    // Handle media upload if an image URL is provided
    if (imageUrl) {
      // Download the image from the URL (Twitter requires a file upload, not just a URL)
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageData = Buffer.from(imageResponse.data);

      // Upload media using v1.1 endpoint (v2 doesn't support media upload directly yet)
      const mediaUploadResponse = await axios.post(
        'https://upload.twitter.com/1.1/media/upload.json',
        imageData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream',
          },
          params: {
            media_category: 'tweet_image', // Specify for tweet images
          },
        }
      );
      mediaId = mediaUploadResponse.data.media_id_string;
      console.log(`Twitter media uploaded successfully: ${mediaId}`);
    }

    // Construct tweet text
    const tweetText = `${caption}${hashtags ? ' ' + hashtags : ''}${location ? ` ${location}` : ''}`;

    // Post tweet using v2 endpoint
    const tweetData = {
      text: tweetText,
    };
    if (mediaId) {
      tweetData.media = { media_ids: [mediaId] };
    }

    const tweetResponse = await axios.post(
      'https://api.twitter.com/2/tweets',
      tweetData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    uploadTime = new Date().toISOString();
    console.log(`Twitter post successful at ${uploadTime}, Tweet ID: ${tweetResponse.data.data.id}`);
    success = true;
  } catch (error) {
    console.error(`Twitter post failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }

  // Log the result to history file
  const logEntry = `${originalTime.toISOString()}\t${imageUrl || ''}\t${caption}\t${hashtags || ''}\t${location || ''}\t${success ? 'Yes' : 'No'}\t${success ? uploadTime : ''}\n`;
  if (!fs.existsSync(uploadHistoryPath)) {
    fs.writeFileSync(uploadHistoryPath, 'Publish Date\tMedia URL\tCaption\tHashtags\tLocation\tUpload Success\tUpload Time\n');
  }
  fs.appendFileSync(uploadHistoryPath, logEntry);

  // Log successful upload timestamp
  if (success) {
    fs.appendFileSync(uploadedLogPath, `${originalTime.toISOString()}\n`);
  }
}

module.exports = { postToTwitter };