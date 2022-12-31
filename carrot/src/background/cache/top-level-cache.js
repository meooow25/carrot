const TIMEOUT = 30 * 1000;  // 30 seconds

/**
 * Short time cache on the response to a prediction request.
 * Useful if the user repeatedly reloads a tab or opens multiple tabs to the same ranklist in a
 * short period of time, the same predictions will be sent to all.
 */
export default class TopLevelCache {
  constructor() {
    this.map = new Map();
  }

  getOr(contestId, responsePromiseGen) {
    if (!this.map.has(contestId)) {
      this.map.set(contestId, responsePromiseGen());
      setTimeout(() => void this.map.delete(contestId), TIMEOUT);
    }
    return this.map.get(contestId);
  }
}
