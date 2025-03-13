const csvHeader = 'Video ID,Created Time,Title,Description,Thumbnail URL,Likes,Comments,Views,Engagement';
const csvHeaderTopPosts = 'Video ID,Created Time,Title,URL,Likes,Comments,Views,Engagement';
const apiFields = 'id,snippet{title,description,publishedAt,thumbnails},statistics{viewCount,likeCount,commentCount}';

const mapPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.title.replace(/"/g, '""')}","${post.description.replace(/"/g, '""')}","${post.thumbnail_url}",${post.likes},${post.comments},${post.views},${post.engagement}`;

const mapTopPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.title.replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.views},${post.engagement}`;

module.exports = { csvHeader, csvHeaderTopPosts, apiFields, mapPostToCsvRow, mapTopPostToCsvRow };