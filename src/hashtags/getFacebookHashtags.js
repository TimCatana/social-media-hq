const axios = require('axios');

async function getFacebookHashtags(seedKeyword, token) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  if (!pageId) throw new Error('FACEBOOK_PAGE_ID not set in .env');
  const hashtag = `#${seedKeyword.toLowerCase()}`;

  const response = await axios.get(`https://graph.facebook.com/v20.0/${pageId}/posts`, {
    params: { access_token: token, fields: 'message', limit: 100 },
  });
  const posts = response.data.data || [];

  const relevantPosts = posts.filter(post => post.message && post.message.toLowerCase().includes(hashtag));
  const hashtagCounts = {};
  relevantPosts.forEach(post => {
    const hashtags = post.message.match(/#\w+/g) || [];
    hashtags.forEach(tag => {
      const lowerTag = tag.toLowerCase();
      if (lowerTag !== hashtag) {
        hashtagCounts[lowerTag] = (hashtagCounts[lowerTag] || 0) + 1;
      }
    });
  });

  return Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([hashtag, frequency]) => ({ hashtag, frequency }));
}

module.exports = { getFacebookHashtags };