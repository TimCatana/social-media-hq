const axios = require('axios');
const fs = require('fs');

async function postToPinterest(post) {
  const { imageUrl, caption, hashtags, location, title, boardId, link, altText, originalTime, accessToken, uploadHistoryPath, uploadedLogPath } = post;

  if (!boardId) {
    console.error('Board ID is required for Pinterest');
    return;
  }

  let success = false;
  let uploadTime = '';
  try {
    const description = `${hashtags ? hashtags + ' ' : ''}${location ? 'Location: ' + location : ''}${caption ? '\n' + caption : ''}`;
    const response = await axios.post(
      'https://api.pinterest.com/v5/pins',
      {
        board_id: boardId,
        title: title || 'Untitled',
        description: description.trim() || 'No description',
        media_source: {
          source_type: 'image_url',
          url: imageUrl
        },
        link: link || undefined,
        alt_text: altText || undefined
        // dominant_color and parent_pin_id left blank as requested
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    uploadTime = new Date().toISOString();
    console.log(`Pinterest post successful at ${uploadTime}: ${response.data.id}`);
    success = true;
  } catch (error) {
    console.error(`Pinterest post failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
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

module.exports = { postToPinterest };