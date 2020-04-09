import { LOCAL } from './storage-wrapper.js';

const LAST_RATING_FETCH_MILLIS = 'lastRatingFetchMilis';
const RATINGS = 'ratings';

async function getLastRatingFetchMillis() {
  return await LOCAL.get(LAST_RATING_FETCH_MILLIS, 0);
}

async function setLastRatingFetchMillis(timeMillis) {
  return await LOCAL.set(LAST_RATING_FETCH_MILLIS, timeMillis);
}

async function getRatings() {
  return await LOCAL.get(RATINGS);
}

async function setRatings(ratingMap, timeMillis) {
  await setLastRatingFetchMillis(timeMillis);
  return await LOCAL.set(RATINGS, ratingMap);
}

async function isCacheFresh(laterThanMillis) {
  const lastRatingFetchTime = await getLastRatingFetchMillis();
  return laterThanMillis <= lastRatingFetchTime;
}

export { getRatings, setRatings, isCacheFresh };
