const { DateTime } = require('luxon');

let verboseMode = false;

async function setupConsoleLogging(verbose = false) {
  verboseMode = verbose;
  console.log = (...args) => {
    const timestamp = DateTime.now().toISO();
    process.stdout.write(`[${timestamp}] INFO: ${args.join(' ')}\n`);
  };
}

function log(level, message) {
  const timestamp = DateTime.now().toISO();
  if (level === 'VERBOSE' && !verboseMode) return;
  process.stdout.write(`[${timestamp}] ${level}: ${message}\n`);
}

module.exports = { setupConsoleLogging, log };