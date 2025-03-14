const { ensurePinterestAuth } = require('../utils/authUtils');

async function getPinterestToken(config) {
  return await ensurePinterestAuth(config);
}

module.exports = { getPinterestToken };