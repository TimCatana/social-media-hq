const { ensureFacebookAuth } = require('../utils/authUtils');

async function getFacebookToken(config) {
  return await ensureFacebookAuth(config);
}

module.exports = { getFacebookToken };