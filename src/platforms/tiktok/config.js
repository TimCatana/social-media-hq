const csvHeader = 'Video ID,Created Time,Title,Description,Media URL,Likes,Comments,Views,Shares,Engagement';
const csvHeaderTopPosts = 'Video ID,Created Time,Description,URL,Likes,Comments,Views,Shares,Engagement';
const apiFields = 'id,create_time,title,description,video_url,stats{play_count,comment_count,digg_count,share_count}';

const mapPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.title.replace(/"/g, '""')}","${post.description.replace(/"/g, '""')}","${post.media_url}",${post.likes},${post.comments},${post.views},${post.shares},${post.engagement}`;

const mapTopPostToCsvRow = post =>
  `"${post.id}","${post.created_time}","${post.description.replace(/"/g, '""')}","${post.url}",${post.likes},${post.comments},${post.views},${post.shares},${post.engagement}`;

module.exports = { csvHeader, csvHeaderTopPosts, apiFields, mapPostToCsvRow, mapTopPostToCsvRow };