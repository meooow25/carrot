import Lock from '../../util/lock.js';

const REFRESH_INTERVAL_ON_OK = 60 * 60 * 1000;  // 1 hour
const REFRESH_INTERVAL_ON_ERR = 20 * 60 * 1000;  // 20 minutes

/**
 * In-memory cache of contest infos.
 */
export default class Contests {
  constructor(api) {
    this.api = api;
    this.contestMap = new Map();
    this.lock = new Lock();
    this.lastFetchTime = 0;
    this.lastFetchOk = false;
  }

  async maybeRefreshCache() {
    const inner = async () => {
      const now = Date.now();
      const minInterval = this.lastFetchOk ? REFRESH_INTERVAL_ON_OK : REFRESH_INTERVAL_ON_ERR;
      const refresh = now - this.lastFetchTime > minInterval;
      if (!refresh) {
        return;
      }
      this.lastFetchTime = now;
      try {
        const contests = await this.api.contest.list();
        this.contestMap = new Map(contests.map((c) => [c.id, c]));
        this.lastFetchOk = true;
      } catch (er) {
        console.warn('Unable to fetch contest list: ' + er);
        this.lastFetchOk = false;
      }
    };

    // Not that heavy so simultaneous queries aren't a terrible thing to do, but lock anyway.
    await this.lock.execute(inner);
  }

  list() {
    return Array.from(this.contestMap.values());
  }

  hasCached(contestId) {
    return this.contestMap.has(contestId);
  }

  getCached(contestId) {
    return this.contestMap.get(contestId);
  }

  update(contest) {
    this.contestMap.set(contest.id, contest);
  }
}
