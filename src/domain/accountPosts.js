// ./domain/accountPosts.js
const { getFacebookAccountPosts } = require('../backend/posts/getFacebookAccountPosts');
const { getInstagramAccountPosts } = require('../backend/posts/getInstagramAccountPosts');
const { getPinterestAccountPosts } = require('../backend/posts/getPinterestAccountPosts');
const { getTikTokAccountPosts } = require('../backend/posts/getTikTokAccountPosts');
const { getThreadsAccountPosts } = require('../backend/posts/getThreadsAccountPosts');
const { getYouTubeAccountPosts } = require('../backend/posts/getYouTubeAccountPosts');
const { getRumbleAccountPosts } = require('../backend/posts/getRumbleAccountPosts');
const { getTwitterAccountPosts } = require('../backend/posts/getTwitterAccountPosts');

// Common metrics for sorting (platform-specific availability noted in implementations)
const ACCOUNT_POST_METRICS = ['likes', 'comments', 'views', 'engagement'];

module.exports = {
  getFacebookAccountPosts,
  getInstagramAccountPosts,
  getPinterestAccountPosts,
  getTikTokAccountPosts,
  getThreadsAccountPosts,
  getYouTubeAccountPosts,
  getRumbleAccountPosts,
  getTwitterAccountPosts,
  ACCOUNT_POST_METRICS,
};