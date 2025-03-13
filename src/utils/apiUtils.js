const axios = require('axios');
const { log } = require('./logUtils');

async function fetchPaginatedData(url, params, accessToken, verbose = false, options = {}) {
  const { maxItems = Infinity, dataKey = 'data', nextKey = 'paging.next' } = options;
  const data = [];
  let nextUrl = url;

  do {
    try {
      if (verbose) log('VERBOSE', `Fetching from ${nextUrl} with params: ${JSON.stringify(params)}`);
      const response = await axios.get(nextUrl, {
        params: { ...params, access_token: accessToken },
        headers: options.headers || {},
      });

      const items = dataKey.split('.').reduce((obj, key) => obj?.[key], response.data) || [];
      data.push(...items);

      nextUrl = nextKey.split('.').reduce((obj, key) => obj?.[key], response.data);
    } catch (error) {
      log('ERROR', `API fetch failed: ${error.response?.data?.error?.message || error.message}`);
      throw error;
    }
  } while (nextUrl && data.length < maxItems);

  if (verbose) log('VERBOSE', `Fetched ${data.length} items from ${url}`);
  return data;
}

module.exports = { fetchPaginatedData };