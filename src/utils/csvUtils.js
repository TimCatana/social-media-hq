const fs = require('fs').promises;
const path = require('path');
const { parse } = require('csv-parse/sync');
const { log } = require('./logUtils');
const { DateTime } = require('luxon');

const CSV_DIR = path.join(__dirname, '..', '..', 'bin', 'csv');

const CSV_FORMATS = {
  facebook: 'Publish Date,Media URL,Caption,Hashtags,Location',
  instagram: 'Publish Date,Media URL,Caption,Hashtags,Location',
  pinterest: 'Publish Date,Media URL,Caption,Hashtags,Location,Title,Board ID,External Link,Alt Text',
  rumble: 'Publish Date,Media URL,Caption,Hashtags,Location,Duration (seconds)',
  threads: 'Publish Date,Media URL,Caption,Hashtags,Location',
  tiktok: 'Publish Date,Media URL,Caption,Hashtags',
  twitter: 'Publish Date,Media URL,Caption,Hashtags,Location',
  youtube: 'Publish Date,Media URL,Title,Description,Tags',
};

async function writeCsv(fileName, header, rows, verbose = false) {
  try {
    await fs.mkdir(CSV_DIR, { recursive: true });
    const csvPath = path.join(CSV_DIR, `${fileName}_${DateTime.now().toFormat('yyyyMMddHHmmss')}.csv`);
    const csvContent = `${header}\n${rows.join('\n')}`;
    await fs.writeFile(csvPath, csvContent);

    log('INFO', `CSV written to ${csvPath}`);
    if (verbose) log('VERBOSE', `CSV contains ${rows.length} rows`);
    return csvPath;
  } catch (error) {
    log('ERROR', `Failed to write CSV: ${error.message}`);
    throw error;
  }
}

async function parseCsv(csvPath) {
  try {
    const content = await fs.readFile(csvPath, 'utf8');
    const records = parse(content, { columns: true, skip_empty_lines: true });
    log('INFO', `Parsed ${records.length} posts from ${csvPath}`);
    return records;
  } catch (error) {
    log('ERROR', `Failed to parse CSV ${csvPath}: ${error.message}`);
    throw error;
  }
}

function displayCsvFormat(platform) {
  log('INFO', `\nCSV Format for ${platform.charAt(0).toUpperCase() + platform.slice(1)}:`);
  log('INFO', `"${CSV_FORMATS[platform]}"`);
  log('INFO', 'Notes:');
  log('INFO', '- Publish Date: Format as "yyyy-MM-dd\'T\'HH:mm:ss" (e.g., "2025-03-10T12:00:00")');
  log('INFO', '- Media URL: Use .jpg, .png for images; .mp4, .mov for videos');
  if (platform === 'rumble') log('INFO', '- Duration: Optional, in seconds; used to classify short (<60s) vs long videos');
  log('INFO', '\n');
}

module.exports = { writeCsv, parseCsv, displayCsvFormat };