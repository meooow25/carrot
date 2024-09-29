import Lock from '../../util/lock.js';

const REFRESH_INTERVAL = 6 * 60 * 60 * 1000;  // 6 hours

/**
 * In-memory cache of contest infos.
 */
export default class Contests {
  constructor(api) {
    this.api = api;
    this.contestMap = new Map();
    this.lock = new Lock();
    this.lastAttemptTime = 0;
  }

  async maybeRefreshCache() {
    const inner = async () => {
      const now = Date.now();
      const refresh = now - this.lastAttemptTime > REFRESH_INTERVAL;
      if (!refresh) {
        return;
      }
      this.lastAttemptTime = now;
      try {
        const contests = await this.api.contestList();
        this.contestMap = new Map(contests.map((c) => [c.id, c]));
      } catch (er) {
        console.warn('Unable to fetch contest list: ' + er);
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
