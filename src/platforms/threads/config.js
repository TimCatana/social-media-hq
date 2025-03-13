const csvHeader = 'Post ID,Created Time,Text,Permalink,Likes,Comments,Media Type,Media URL,Views,Engagement';
const csvHeaderTopPosts = 'Post ID,Created Time,Text,URL,Likes,Comments,Engagement';
const apiFields = 'id,created_time,text,permalink,media_type,media_url,like_count,comments_count';

const mapPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.text.replace(/"/g, '""')}","${post.permalink}",${post.likes},${post.comments},"${post.media_type}","${post.media_url}",${post.views},${post.engagement}`;

const mapTopPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.text.replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.engagement}`;

module.exports = { csvHeader, csvHeaderTopPosts, apiFields, mapPostToCsvRow, mapTopPostToCsvRow };