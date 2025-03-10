const axios = require('axios');
const prompts = require('prompts');
const fs = require('fs').promises;
const path = require('path');
const { getTwitterToken } = require('../auth/twitterAuth');
const { loadConfig, saveConfig } = require('../auth/authUtils');

async function getTwitterPostInformation() {
  const config = await loadConfig();
  const accessToken = await getTwitterToken(config);
  const csvPath = path.join(__dirname, '..', '..', 'bin', 'csv', 'twitter_post_analysis.csv');

  try {
    // Fetch user tweets (assuming v2 API with bearer token)
    const tweetsResponse = await axios.get(
      'https://api.twitter.com/2/users/me/tweets',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: {
          'tweet.fields': 'created_at,public_metrics',
          max_results: 100
        }
      }
    );
    const tweets = tweetsResponse.data.data;

    const tweetData = tweets.map(tweet => ({
      id: tweet.id,
      created_at: tweet.created_at,
      impressions: tweet.public_metrics.impression_count || 0,
      likes: tweet.public_metrics.like_count || 0,
      retweets: tweet.public_metrics.retweet_count || 0
    }));

    const { sortBy } = await prompts({
      type: 'select',
      name: 'sortBy',
      message: 'Sort Twitter posts by:',
      choices: [
        { title: 'Impressions', value: 'impressions' },
        { title: 'Likes', value: 'likes' },
        { title: 'Retweets', value: 'retweets' }
      ]
    }, { onCancel: () => process.exit(1) });

    tweetData.sort((a, b) => b[sortBy] - a[sortBy]);

    const csvHeader = 'Tweet ID,Created At,Impressions,Likes,Retweets\n';
    const csvRows = tweetData.map(tweet => 
      `${tweet.id},${tweet.created_at},${tweet.impressions},${tweet.likes},${tweet.retweets}`
    ).join('\n');
    await fs.writeFile(csvPath, csvHeader + csvRows);

    console.log(`Twitter posts sorted by ${sortBy} saved to ${csvPath}`);
    await saveConfig(config);
  } catch (error) {
    console.error(`Twitter analysis failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }
}

module.exports = { getTwitterPostInformation };