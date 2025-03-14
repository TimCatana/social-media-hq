const { ensureRumbleAuth } = require('../utils/authUtils');

async function getRumbleToken(config) {
  return await ensureRumbleAuth(config);
}

module.exports = { getRumbleToken };