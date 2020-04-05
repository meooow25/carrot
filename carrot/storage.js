const LAST_RATING_FETCH_MILLIS = 'lastRatingFetchMilis';
const RATINGS = 'ratings';

async function getLastRatingFetchMillis() {
  const obj = await browser.storage.local.get(LAST_RATING_FETCH_MILLIS);
  return obj[LAST_RATING_FETCH_MILLIS] || 0;
}

function setLastRatingFetchMillis(timeMillis) {
  return browser.storage.local.set({ [LAST_RATING_FETCH_MILLIS]: timeMillis });
}

async function getRatings() {
  return (await browser.storage.local.get(RATINGS))[RATINGS];
}

function setRatings(ratingMap, timeMillis) {
  setLastRatingFetchMillis(timeMillis);
  return browser.storage.local.set({ [RATINGS]: ratingMap });
}

async function isCacheFresh(laterThanMillis) {
  const lastRatingFetchTime = await getLastRatingFetchMillis();
  return laterThanMillis <= lastRatingFetchTime;
}

export { getRatings, setRatings, isCacheFresh };
