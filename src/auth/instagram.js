const { ensureInstagramAuth, ensureThreadsAuth } = require('../utils/authUtils');

module.exports = {
  getInstagramToken: config => ensureInstagramAuth(config),
  getThreadsToken: config => ensureThreadsAuth(config),
};