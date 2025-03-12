const fs = require('fs').promises;
const path = require('path');
const { DateTime } = require('luxon');

// Log directory
const LOG_DIR = path.join(__dirname, '..', '..', '..', 'logs');
let consoleLogFile;

// Setup console logging with a timestamped file
async function setupConsoleLogging(verbose = false) {
  const timestamp = DateTime.now().toFormat('yyyy-MM-dd_HH-mm-ss');
  consoleLogFile = path.join(LOG_DIR, `main-${timestamp}.log`);
  await fs.mkdir(LOG_DIR, { recursive: true }).catch(err => {
    console.error(`Failed to create log directory: ${err.message}`);
    process.exit(1);
  });
  await fs.appendFile(consoleLogFile, `[${DateTime.now().toISO()}] INFO: Console logging initialized\n`);
  if (verbose) {
    console.log(`[${DateTime.now().toISO()}] VERBOSE: Logging setup with verbose mode`);
    await fs.appendFile(consoleLogFile, `[${DateTime.now().toISO()}] VERBOSE: Logging setup with verbose mode\n`);
  }
}

// Log function without color-coded output
async function log(level, message) {
  const timestamp = DateTime.now().toISO();
  const logMessage = `[${timestamp}] ${level}: ${message}`;
  
  // Console output (plain text)
  console.log(logMessage);

  // File output (plain text)
  if (consoleLogFile) {
    try {
      await fs.appendFile(consoleLogFile, `${logMessage}\n`);
    } catch (err) {
      console.error(`Failed to write to log file: ${err.message}`);
    }
  }
}

module.exports = { log, setupConsoleLogging };