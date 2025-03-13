const csvHeader = 'Post ID,Created Time,Message,Permalink URL,Likes,Comments,Shares,Media Type,Media URL,Views,Engagement';
const csvHeaderTopPosts = 'Post ID,Created Time,Message,URL,Likes,Comments,Shares,Engagement';
const apiFields = 'id,created_time,message,permalink_url,reactions.summary(total_count),comments.summary(total_count),shares,attachments{media_type,url}';

const mapPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.message.replace(/"/g, '""')}","${post.permalink_url}",${post.likes},${post.comments},${post.shares},"${post.media_type}","${post.media_url}",${post.views},${post.engagement}`;

const mapTopPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.message.replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.shares},${post.engagement}`;

module.exports = { csvHeader, csvHeaderTopPosts, apiFields, mapPostToCsvRow, mapTopPostToCsvRow };