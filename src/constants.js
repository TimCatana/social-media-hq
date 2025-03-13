const PLATFORMS = [
    'facebook', 'instagram', 'pinterest', 'rumble',
    'threads', 'tiktok', 'twitter', 'youtube'
  ];
  
  const METRICS = {
    facebook: ['likes', 'comments', 'shares', 'engagement'],
    instagram: ['likes', 'comments', 'engagement'],
    pinterest: ['likes', 'comments', 'engagement'],
    rumble: ['likes', 'comments', 'views', 'engagement'],
    threads: ['likes', 'comments', 'engagement'],
    tiktok: ['likes', 'comments', 'views', 'shares', 'engagement'],
    twitter: ['likes', 'comments', 'views', 'retweets', 'engagement'],
    youtube: ['likes', 'comments', 'views', 'engagement'],
  };
  
  module.exports = { PLATFORMS, METRICS };