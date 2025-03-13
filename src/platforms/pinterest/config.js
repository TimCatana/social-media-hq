const csvHeader = 'Pin ID,Created Time,Title,Description,URL,Media Type,Media URL,Likes,Comments,Views,Engagement';
const csvHeaderTopPosts = 'Pin ID,Created Time,Description,URL,Likes,Comments,Engagement';
const apiFields = 'id,created_at,title,description,link,media{media_type,images,video_url},save_count,comment_count';

const mapPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.title.replace(/"/g, '""')}","${post.description.replace(/"/g, '""')}","${post.url}","${post.media_type}","${post.media_url}",${post.likes},${post.comments},${post.views},${post.engagement}`;

const mapTopPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.description.replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.engagement}`;

module.exports = { csvHeader, csvHeaderTopPosts, apiFields, mapPostToCsvRow, mapTopPostToCsvRow };