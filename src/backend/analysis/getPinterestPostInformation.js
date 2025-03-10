const axios = require('axios');
const prompts = require('prompts');
const fs = require('fs').promises;
const path = require('path');
const { getPinterestToken } = require('../auth/pinterestAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');

async function getPinterestPostInformation() {
  const config = await loadConfig();
  const accessToken = await getPinterestToken(config);
  const csvPath = path.join(__dirname, '..', '..', 'bin', 'csv', 'pinterest_post_analysis.csv');

  try {
    const pinsResponse = await axios.get(
      'https://api.pinterest.com/v5/pins',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: { fields: 'id,created_at,metrics' }
      }
    );
    const pins = pinsResponse.data.items;

    const pinData = pins.map(pin => ({
      id: pin.id,
      created_at: pin.created_at,
      impressions: pin.metrics?.pin_impressions || 0,
      clicks: pin.metrics?.outbound_clicks || 0,
      saves: pin.metrics?.saves || 0
    }));

    const { sortBy } = await prompts({
      type: 'select',
      name: 'sortBy',
      message: 'Sort Pinterest pins by:',
      choices: [
        { title: 'Impressions', value: 'impressions' },
        { title: 'Clicks', value: 'clicks' },
        { title: 'Saves', value: 'saves' }
      ]
    }, { onCancel: () => process.exit(1) });

    pinData.sort((a, b) => b[sortBy] - a[sortBy]);

    const csvHeader = 'Pin ID,Created At,Impressions,Clicks,Saves\n';
    const csvRows = pinData.map(pin => 
      `${pin.id},${pin.created_at},${pin.impressions},${pin.clicks},${pin.saves}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    console.log(`Pinterest pins sorted by ${sortBy} saved to ${csvPath}`);
    await saveConfig(config);
  } catch (error) {
    console.error(`Pinterest analysis failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }
}

module.exports = { getPinterestPostInformation };