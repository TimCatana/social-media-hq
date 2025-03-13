const { promptForToken } = require('../utils/promptUtils');
const { log } = require('../utils/logUtils');
const { DateTime } = require('luxon');
const { TokenManager } = require('./tokenManager');

async function getRumbleToken(config) {
  const tokenManager = new TokenManager('rumble', config);

  if (tokenManager.isTokenValid()) {
    log('INFO', `Using existing Rumble token: ${tokenManager.getToken().token.substring(0, 10)}...`);
    return tokenManager.getToken().token;
  }

  const userAccessToken = await promptForToken('Rumble', 'hypothetical API access');
  tokenManager.setToken(userAccessToken, DateTime.now().plus({ days: 30 }).toISO());
  await tokenManager.save();
  return userAccessToken;
}

module.exports = { getRumbleToken };