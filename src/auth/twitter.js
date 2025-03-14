const { ensureTwitterAuth } = require('../utils/authUtils');

async function getTwitterToken(config) {
  return await ensureTwitterAuth(config);
}

module.exports = { getTwitterToken };