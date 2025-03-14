const prompts = require('prompts');

async function promptForText(options) {
  const response = await prompts(options);
  return response; // Returns { value: 'input' }
}

async function promptForToken(platform, scope) {
  const response = await prompts({
    type: 'text',
    name: 'token',
    message: `Enter a User Access Token for ${platform} (${scope}):`,
    validate: value => !!value || 'Token is required',
  });
  return response.token;
}

async function promptForPlatform(type) {
  const response = await prompts({
    type: 'select',
    name: 'platform',
    message: `Choose a platform for ${type}:`,
    choices: [
      { title: 'Facebook', value: 'facebook' },
      { title: 'Instagram', value: 'instagram' },
      { title: 'Pinterest', value: 'pinterest' },
      { title: 'Rumble', value: 'rumble' },
      { title: 'Threads', value: 'threads' },
      { title: 'TikTok', value: 'tiktok' },
      { title: 'Twitter', value: 'twitter' },
      { title: 'YouTube', value: 'youtube' },
      { title: 'Back', value: 'back' },
    ],
  });
  return response.platform;
}

async function promptForCsvPath(platform, defaultDir) {
  const response = await prompts({
    type: 'text',
    name: 'path',
    message: `Enter the path to your ${platform} CSV file (or press Enter to return):`,
    initial: defaultDir,
  });
  return response.path || 'back';
}

async function promptForAccount(platform) {
  const response = await prompts({
    type: 'text',
    name: 'account',
    message: `Enter the ${platform} account handle (e.g., @username):`,
    validate: value => !!value || 'Account handle is required',
  });
  return response.account || 'back';
}

async function promptForIsMyAccount(platform) {
  const response = await prompts({
    type: 'confirm',
    name: 'isMyAccount',
    message: `Is this your ${platform} account?`,
    initial: true,
  });
  return response.isMyAccount === undefined ? 'back' : response.isMyAccount;
}

async function promptForHashtag(platform) {
  const response = await prompts({
    type: 'text',
    name: 'hashtag',
    message: `Enter a hashtag to search on ${platform} (e.g., #hashtag):`,
    validate: value => !!value || 'Hashtag is required',
  });
  return response.hashtag || 'back';
}

async function promptForMetric(choices) {
  const response = await prompts({
    type: 'select',
    name: 'metric',
    message: 'Choose a metric to sort by:',
    choices: [...choices, { title: 'Back', value: 'back' }],
  });
  return response.metric;
}

async function promptForMode() {
  const response = await prompts({
    type: 'select',
    name: 'mode',
    message: 'Choose a mode:',
    choices: [
      { title: 'Get Account Posts', value: 'accountPosts' },
      { title: 'Get Top Posts by Hashtag', value: 'topPosts' },
      { title: 'Schedule Posts', value: 'schedulePosts' },
      { title: 'Exit', value: 'exit' },
    ],
  });
  return response.mode || 'exit'; // Default to 'exit' if cancelled
}

module.exports = {
  promptForText,
  promptForToken,
  promptForPlatform,
  promptForCsvPath,
  promptForAccount,
  promptForIsMyAccount,
  promptForHashtag,
  promptForMetric,
  promptForMode,
};