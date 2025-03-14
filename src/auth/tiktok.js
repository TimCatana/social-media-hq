const { ensureTikTokAuth } = require('../utils/authUtils');

async function getTikTokToken(config) {
  return await ensureTikTokAuth(config);
}

module.exports = { getTikTokToken };