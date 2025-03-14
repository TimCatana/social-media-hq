const { log } = require('./logUtils');
const {
  ensureFacebookConfig, ensureInstagramConfig, ensurePinterestConfig, ensureRumbleConfig,
  ensureThreadsConfig, ensureTikTokConfig, ensureTwitterConfig, ensureYouTubeConfig,
} = require('./configManager');
const {
  ensureFacebookToken, ensureInstagramToken, ensurePinterestToken, ensureRumbleToken,
  ensureThreadsToken, ensureTikTokToken, ensureTwitterToken, ensureYouTubeToken,
} = require('./tokenManager');
const {
  validateFacebookToken, validateInstagramToken, validatePinterestToken, validateRumbleToken,
  validateThreadsToken, validateTikTokToken, validateTwitterToken, validateYouTubeToken,
} = require('./tokenValidator');

async function ensureFacebookAuth(config) {
  log('INFO', 'Checking Facebook authentication...');
  await ensureFacebookConfig(config);
  const token = await ensureFacebookToken(config);
  if (!(await validateFacebookToken(token, config))) throw new Error('Invalid Facebook token');
  return token;
}

async function ensureInstagramAuth(config) {
  log('INFO', 'Checking Instagram authentication...');
  await ensureInstagramConfig(config);
  const token = await ensureInstagramToken(config);
  if (!(await validateInstagramToken(token, config))) throw new Error('Invalid Instagram token');
  return token;
}

async function ensurePinterestAuth(config) {
  log('INFO', 'Checking Pinterest authentication...');
  await ensurePinterestConfig(config);
  const token = await ensurePinterestToken(config);
  if (!(await validatePinterestToken(token))) throw new Error('Invalid Pinterest token');
  return token;
}

async function ensureRumbleAuth(config) {
  log('INFO', 'Checking Rumble authentication...');
  await ensureRumbleConfig(config);
  const token = await ensureRumbleToken(config);
  if (!(await validateRumbleToken(token))) throw new Error('Invalid Rumble token');
  return token;
}

async function ensureThreadsAuth(config) {
  log('INFO', 'Checking Threads authentication...');
  await ensureThreadsConfig(config);
  const token = await ensureThreadsToken(config);
  if (!(await validateThreadsToken(token, config))) throw new Error('Invalid Threads token');
  return token;
}

async function ensureTikTokAuth(config) {
  log('INFO', 'Checking TikTok authentication...');
  await ensureTikTokConfig(config);
  const token = await ensureTikTokToken(config);
  if (!(await validateTikTokToken(token))) throw new Error('Invalid TikTok token');
  return token;
}

async function ensureTwitterAuth(config) {
  log('INFO', 'Checking Twitter authentication...');
  await ensureTwitterConfig(config);
  const token = await ensureTwitterToken(config);
  if (!(await validateTwitterToken(token))) throw new Error('Invalid Twitter token');
  return token;
}

async function ensureYouTubeAuth(config) {
  log('INFO', 'Checking YouTube authentication...');
  await ensureYouTubeConfig(config);
  const token = await ensureYouTubeToken(config);
  if (!(await validateYouTubeToken(token))) throw new Error('Invalid YouTube token');
  return token;
}

module.exports = {
  ensureFacebookAuth,
  ensureInstagramAuth,
  ensurePinterestAuth,
  ensureRumbleAuth,
  ensureThreadsAuth,
  ensureTikTokAuth,
  ensureTwitterAuth,
  ensureYouTubeAuth,
};