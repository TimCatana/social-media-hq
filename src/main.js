const { loadConfig } = require('./utils/configUtils');
const { log } = require('./utils/logUtils');
const { promptForMode } = require('./utils/promptUtils');
const { handleAccountPosts } = require('./features/accountPosts');
const { handleTopPosts } = require('./features/topPosts');
const { handleScheduling } = require('./features/scheduling');

async function main() {
  const verbose = process.argv.includes('--verbose');
  const config = await loadConfig();

  while (true) {
    try {
      const mode = await promptForMode();
      if (mode === 'exit') break;

      switch (mode) {
        case 'accountPosts':
          await handleAccountPosts(config, verbose);
          break;
        case 'topPosts':
          await handleTopPosts(config, verbose);
          break;
        case 'schedulePosts':
          await handleScheduling(config, verbose);
          break;
        default:
          log('ERROR', `Unknown mode: ${mode}`);
      }
    } catch (error) {
      log('ERROR', `Error in main loop: ${error.message}`);
    }
  }

  log('INFO', 'Exiting application');
}

main().catch(error => {
  log('ERROR', `Fatal error: ${error.message}`);
  process.exit(1);
});