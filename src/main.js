const { loadConfig, saveConfig } = require('./utils/configUtils');
const { setupConsoleLogging, log } = require('./utils/logUtils');
const { promptForMode } = require('./utils/promptUtils');
const { handleAccountPosts } = require('./features/accountPosts');
const { handleTopPosts } = require('./features/topPosts');
const { handleScheduling } = require('./features/scheduling');
const { startScheduler } = require('./utils/scheduleUtils');

// Parse command-line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');

async function main() {
  await setupConsoleLogging(verbose); // Pass verbose flag to logging setup
  const config = await loadConfig();
  let state = 'mode';

  while (true) {
    try {
      if (state === 'mode') {
        const mode = await promptForMode();
        if (mode === 'exit') break;
        state = mode;
      } else if (state === 'postdata') {
        await handleAccountPosts();
        state = 'mode';
      } else if (state === 'topposts') {
        await handleTopPosts();
        state = 'mode';
      } else if (state === 'scheduling') {
        await handleScheduling(config, verbose); // Pass verbose flag
        await startScheduler(config, verbose); // Pass verbose flag
        state = 'mode'; // Return to main menu when done
      }
    } catch (error) {
      log('ERROR', `Error in main loop: ${error.message}`);
      state = 'mode';
    }
  }

  await saveConfig(config);
  log('INFO', 'Application exited');
}

main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});