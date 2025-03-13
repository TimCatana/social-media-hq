const prompts = require('prompts');
const fs = require('fs').promises;
const path = require('path'); // Added missing import
const { PLATFORMS } = require('../constants');
const { log } = require('./logUtils');

async function promptForToken(platform, permissions) {
  const { token } = await prompts({
    type: 'text',
    name: 'token',
    message: `Enter a User Access Token for ${platform} (${permissions}):`,
    validate: value => value === '' || !!value || 'A valid token is required',
  }, { onCancel: () => { throw new Error('User cancelled token prompt'); } });

  if (token === '') {
    log('INFO', `${platform} auth: User chose to go back`);
    throw new Error('User chose to go back');
  }

  log('INFO', `${platform} auth: Prompted token: ${token.substring(0, 10)}...`);
  return token;
}

async function promptForMode() {
  const { mode } = await prompts({
    type: 'select',
    name: 'mode',
    message: 'Choose a mode:',
    choices: [
      { title: 'Get Account Posts', value: 'postdata' },
      { title: 'Get Top Posts by Hashtag', value: 'topposts' },
      { title: 'Schedule Posts', value: 'scheduling' },
      { title: 'Exit', value: 'exit' },
    ],
  }, { onCancel: () => process.exit(1) });
  return mode;
}

async function promptForPlatform(context) {
  const choices = PLATFORMS.map(p => ({
    title: p.charAt(0).toUpperCase() + p.slice(1),
    value: p,
  })).concat({ title: 'Back', value: 'back' });
  const { platform } = await prompts({
    type: 'select',
    name: 'platform',
    message: `Choose a platform for ${context}:`,
    choices,
  }, { onCancel: () => process.exit(1) });
  return platform;
}

async function promptForMetric(platform, metrics) {
  const { metric } = await prompts({
    type: 'select',
    name: 'metric',
    message: `Sort ${platform} posts by:`,
    choices: metrics.map(m => ({ title: m.charAt(0).toUpperCase() + m.slice(1), value: m })),
  }, { onCancel: () => process.exit(1) });
  return metric;
}

async function promptForAccount(platform) {
  const { account } = await prompts({
    type: 'text',
    name: 'account',
    message: `Enter the ${platform} account handle (e.g., @username) or ID:`,
    validate: value => !!value || 'Account is required',
  }, { onCancel: () => process.exit(1) });
  return account;
}

async function promptForIsMyAccount() {
  const { isMyAccount } = await prompts({
    type: 'select',
    name: 'isMyAccount',
    message: 'Is this your account?',
    choices: [
      { title: 'Yes', value: true },
      { title: 'No', value: false },
    ],
  }, { onCancel: () => process.exit(1) });
  return isMyAccount;
}

async function promptForHashtag(platform) {
  const { hashtag } = await prompts({
    type: 'text',
    name: 'hashtag',
    message: `Enter the hashtag or keyword for ${platform} (e.g., #example):`,
    validate: value => !!value || 'Hashtag is required',
  }, { onCancel: () => process.exit(1) });
  return hashtag;
}

async function promptForCsvPath(platform, defaultDir) {
  const { csvPath } = await prompts({
    type: 'text',
    name: 'csvPath',
    message: `Enter the path to your ${platform} CSV file (or press Enter to return):`,
    initial: path.join(defaultDir, `${platform}_posts.csv`),
    validate: async value => {
      if (value === '') return true;
      try {
        await fs.access(value);
        return true;
      } catch {
        return 'File not found. Please enter a valid path or press Enter.';
      }
    },
  }, { onCancel: () => process.exit(1) });

  if (csvPath === '') {
    log('INFO', 'User chose to go back from CSV prompt');
    throw new Error('User chose to go back');
  }

  return csvPath;
}

module.exports = {
  promptForToken,
  promptForMode,
  promptForPlatform,
  promptForMetric,
  promptForAccount,
  promptForIsMyAccount,
  promptForHashtag,
  promptForCsvPath,
};