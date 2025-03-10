const prompts = require('prompts');
const { DateTime } = require('luxon');
const { TokenManager, saveConfig } = require('./authUtils');
const { log } = require('../logging/logUtils'); // Updated to logUtils

async function promptForUserToken() {
  const { userAccessToken } = await prompts({
    type: 'text',
    name: 'userAccessToken',
    message: 'Enter a User Access Token for Rumble (hypothetical; from Rumble Developer Portal):',
    validate: v => v === '' || !!v || 'A valid User Access Token is required',
  }, { onCancel: () => { throw new Error('User cancelled token prompt'); } });

  if (userAccessToken === '') {
    log('INFO', 'RumbleAuth: User pressed Enter to go back');
    throw new Error('User chose to go back');
  }

  log('INFO', `RumbleAuth: Prompted user token: ${userAccessToken.substring(0, 10)}...`);
  return userAccessToken;
}

async function getRumbleToken(config) {
  const tokenManager = new TokenManager('rumble', config);
  const existingToken = tokenManager.getToken();

  if (existingToken && DateTime.fromISO(existingToken.expiresAt) > DateTime.now().plus({ days: 5 })) {
    log('INFO', `RumbleAuth: Using existing token: ${existingToken.token.substring(0, 10)}...`);
    return existingToken.token;
  }

  const userAccessToken = await promptForUserToken();
  tokenManager.setToken(userAccessToken, DateTime.now().plus({ days: 30 }).toISO());
  await saveConfig(config);
  return userAccessToken;
}

module.exports = { getRumbleToken };