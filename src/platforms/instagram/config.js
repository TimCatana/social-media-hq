const csvHeader = 'Post ID,Created Time,Caption,Permalink,Likes,Comments,Media Type,Media URL,Views,Engagement';
const csvHeaderTopPosts = 'Post ID,Created Time,Caption,URL,Likes,Comments,Engagement';
const apiFields = 'id,timestamp,caption,permalink,like_count,comments_count,media_type,media_url,thumbnail_url';

const mapPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.caption.replace(/"/g, '""')}","${post.permalink}",${post.likes},${post.comments},"${post.media_type}","${post.media_url}",${post.views},${post.engagement}`;

const mapTopPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.caption.replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.engagement}`;

module.exports = { csvHeader, csvHeaderTopPosts, apiFields, mapPostToCsvRow, mapTopPostToCsvRow };