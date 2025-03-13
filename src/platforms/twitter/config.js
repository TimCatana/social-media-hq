const csvHeader = 'Tweet ID,Created Time,Text,Likes,Comments,Views,Retweets,Media URL,Engagement';
const csvHeaderTopPosts = 'Tweet ID,Created Time,Text,URL,Likes,Comments,Views,Retweets,Engagement';
const apiFields = 'public_metrics,created_at,text,attachments';

const mapPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.text.replace(/"/g, '""')}",${post.likes},${post.comments},${post.views},${post.retweets},"${post.media_url}",${post.engagement}`;

const mapTopPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.text.replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.views},${post.retweets},${post.engagement}`;

module.exports = { csvHeader, csvHeaderTopPosts, apiFields, mapPostToCsvRow, mapTopPostToCsvRow };