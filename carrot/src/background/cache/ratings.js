import Lock from '../../util/lock.js';

const PREFETCH_INTERVAL = 60 * 60 * 1000;  // 1 hour

const RATINGS_TIMESTAMP = 'cache.ratings.timestamp';
const RATINGS = 'cache.ratings';

/**
 * Browser storage cache of user ratings. Ratings of all users are cached because user.info API
 * endpoint does not work with a large number of handles which is required for prediction. Browser
 * storage is used so that the data is retained if the user restarts the browser. The amount of
 * data fetched is around 14MB so we would rather not refetch it. We keep only handles and ratings
 * in storage, which uses around 4MB.
 */
export default class Ratings {
  constructor(api, storage) {
    this.api = api;
    this.storage = storage;
    this.lock = new Lock();
  }

  async maybeRefreshCache(contestStartMs) {
    const inner = async () => {
      const timeLeft = contestStartMs - Date.now();
      if (timeLeft > PREFETCH_INTERVAL) {
        return;
      }
      const timeLeftAfterLastFetch =
        contestStartMs - (await this.storage.get(RATINGS_TIMESTAMP, 0));
      if (timeLeftAfterLastFetch > PREFETCH_INTERVAL) {
        // Last fetch is too old, update cache.
        await this.cacheRatings();
      }
    };

    // This is quite a heavy query, lock to make it impossible to make multiple API calls at once.
    // Multiple API calls will not happen consecutively either, since the last fetched time should
    // be recent enough to early exit the function.
    await this.lock.execute(inner);
  }

  async fetchCurrentRatings(contestStartMs) {
    if (Date.now() < contestStartMs) {
      throw new Error('getCurrentRatings should be called after contest start');
    }
    await this.maybeRefreshCache(contestStartMs);
    return await this.storage.get(RATINGS);
  }

  async cacheRatings() {
    const users = await this.api.user.ratedList(false);
    const ratingMap = {};
    for (const user of users) {
      ratingMap[user.handle] = user.rating;
    }
    await this.storage.set(RATINGS_TIMESTAMP, Date.now());
    await this.storage.set(RATINGS, ratingMap);
  }
}
