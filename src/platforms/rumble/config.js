const csvHeader = 'Video ID,Created Time,Title,Description,Media URL,Likes,Comments,Views,Engagement';
const csvHeaderTopPosts = 'Video ID,Created Time,Title,URL,Likes,Comments,Views,Engagement';
const apiFields = 'id,created_at,title,description,video_url,likes,comments,views';

const mapPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.title.replace(/"/g, '""')}","${post.description.replace(/"/g, '""')}","${post.media_url}",${post.likes},${post.comments},${post.views},${post.engagement}`;

const mapTopPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.title.replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.views},${post.engagement}`;

module.exports = { csvHeader, csvHeaderTopPosts, apiFields, mapPostToCsvRow, mapTopPostToCsvRow };