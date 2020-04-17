const TIMEOUT = 15 * 1000;  // 15 seconds

/**
 * Short time cache on the response to a prediction request.
 * Useful if the user repeatedly reloads a tab or opens multiple tabs to the same ranklist in a
 * short period of time, the same predictions will be sent to all.
 */
class TopLevelCache {
  constructor() {
    this.map = {};
  }

  cache(contestId, deltasPromise) {
    if (this.hasCached(contestId)) {
      throw new Error('Contest ID already present in cache');
    }
    this.map[contestId] = deltasPromise;
    setTimeout(() => { delete this.map[contestId]; }, TIMEOUT);
  }

  hasCached(contestId) {
    return contestId in this.map;
  }

  get(contestId) {
    return this.map[contestId];
  }
}

export { TopLevelCache };
