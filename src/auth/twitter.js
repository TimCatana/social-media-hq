const { promptForToken } = require('../utils/promptUtils');
const { log } = require('../utils/logUtils');
const { DateTime } = require('luxon');
const { TokenManager } = require('./tokenManager');

async function getTwitterToken(config) {
  const tokenManager = new TokenManager('x', config); // Using 'x' as platform key

  if (tokenManager.isTokenValid()) {
    log('INFO', `Using existing Twitter token: ${tokenManager.getToken().token.substring(0, 10)}...`);
    return tokenManager.getToken().token;
  }

  const userAccessToken = await promptForToken('Twitter', 'tweet.write scope');
  tokenManager.setToken(userAccessToken, DateTime.now().plus({ years: 2 }).toISO());
  await tokenManager.save();
  return userAccessToken;
}

module.exports = { getTwitterToken };