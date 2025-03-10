const prompts = require('prompts');
const { DateTime } = require('luxon');
const { TokenManager, saveConfig } = require('./authUtils');
const { log } = require('../logging/logUtils'); // Updated to logUtils

async function promptForUserToken() {
  const { userAccessToken } = await prompts({
    type: 'text',
    name: 'userAccessToken',
    message: 'Enter a Bearer Token for Twitter (from Twitter Developer Portal with tweet.write scope):',
    validate: v => v === '' || !!v || 'A valid Bearer Token is required',
  }, { onCancel: () => { throw new Error('User cancelled token prompt'); } });

  if (userAccessToken === '') {
    log('INFO', 'TwitterAuth: User pressed Enter to go back');
    throw new Error('User chose to go back');
  }

  log('INFO', `TwitterAuth: Prompted user token: ${userAccessToken.substring(0, 10)}...`);
  return userAccessToken;
}

async function getTwitterToken(config) {
  const tokenManager = new TokenManager('twitter', config);
  const existingToken = tokenManager.getToken();

  if (existingToken && DateTime.fromISO(existingToken.expiresAt) > DateTime.now().plus({ days: 5 })) {
    log('INFO', `TwitterAuth: Using existing token: ${existingToken.token.substring(0, 10)}...`);
    return existingToken.token;
  }

  const userAccessToken = await promptForUserToken();
  tokenManager.setToken(userAccessToken, DateTime.now().plus({ years: 2 }).toISO());
  await saveConfig(config);
  return userAccessToken;
}

module.exports = { getTwitterToken };