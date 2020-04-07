import { LOCAL } from './storage-wrapper.js';

const LAST_RATING_FETCH_MILLIS = 'lastRatingFetchMilis';
const RATINGS = 'ratings';

function getLastRatingFetchMillis() {
  return LOCAL.get(LAST_RATING_FETCH_MILLIS, 0);
}

function setLastRatingFetchMillis(timeMillis) {
  return LOCAL.set(LAST_RATING_FETCH_MILLIS, timeMillis);
}

function getRatings() {
  return LOCAL.get(RATINGS);
}

async function setRatings(ratingMap, timeMillis) {
  await setLastRatingFetchMillis(timeMillis);
  return LOCAL.set(RATINGS, ratingMap);
}

async function isCacheFresh(laterThanMillis) {
  const lastRatingFetchTime = await getLastRatingFetchMillis();
  return laterThanMillis <= lastRatingFetchTime;
}

export { getRatings, setRatings, isCacheFresh };
