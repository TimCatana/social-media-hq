const { getFacebookAccountPosts } = require('../backend/posts/getFacebookAccountPosts');
const { getInstagramAccountPosts } = require('../backend/posts/getInstagramAccountPosts');
const { getPinterestAccountPosts } = require('../backend/posts/getPinterestAccountPosts');
const { getTikTokAccountPosts } = require('../backend/posts/getTikTokAccountPosts');
const { getThreadsAccountPosts } = require('../backend/posts/getThreadsAccountPosts');
const { getYouTubeAccountPosts } = require('../backend/posts/getYouTubeAccountPosts');
const { getRumbleAccountPosts } = require('../backend/posts/getRumbleAccountPosts');
const { getTwitterAccountPosts } = require('../backend/posts/getTwitterAccountPosts');

module.exports = {
  getFacebookAccountPosts,
  getInstagramAccountPosts,
  getPinterestAccountPosts,
  getTikTokAccountPosts,
  getThreadsAccountPosts,
  getYouTubeAccountPosts,
  getRumbleAccountPosts,
  getTwitterAccountPosts,
};