const { ensureYouTubeAuth } = require('../utils/authUtils');

async function getYouTubeToken(config) {
  return await ensureYouTubeAuth(config);
}

module.exports = { getYouTubeToken };