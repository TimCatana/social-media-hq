const axios = require('axios');

async function getThreadsHashtags(seedKeyword, token) {
  const userId = process.env.THREADS_USER_ID || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!userId) throw new Error('THREADS_USER_ID or INSTAGRAM_BUSINESS_ACCOUNT_ID not set in .env');
  const hashtag = `#${seedKeyword.toLowerCase()}`;

  const response = await axios.get(`https://graph.threads.net/v1.0/${userId}/threads`, {
    params: { access_token: token, fields: 'text', limit: 100 },
  });
  const posts = response.data.data || [];

  const relevantPosts = posts.filter(post => post.text && post.text.toLowerCase().includes(hashtag));
  const hashtagCounts = {};
  relevantPosts.forEach(post => {
    const hashtags = post.text.match(/#\w+/g) || [];
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

module.exports = { getThreadsHashtags };