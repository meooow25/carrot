import { Lock } from "./lock.js";

const REFRESH_INTERVAL_ON_OK = 60 * 60 * 1000;  // 1 hour
const REFRESH_INTERVAL_ON_ERR = 20 * 60 * 1000;  // 20 minutes

/**
 * In-memory cache of contest infos.
 */
class Contests {
  constructor(api) {
    this.api = api;
    this.contestMap = {};
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
        const contestMap = {};
        for (const c of contests) {
          contestMap[c.id] = c;
        }
        this.contestMap = contestMap;
        this.lastFetchOk = true;
      } catch (er) {
        console.warn('Unable to fetch contest list: ' + er);
        this.lastFetchOk = false;
      }
    };

    // Not that heavy so simultaneous queries aren't a terrible thing to do, but lock anyway.
    await this.lock.acquire();
    await inner();
    this.lock.release();
  }

  list() {
    return Object.values(this.contestMap);
  }

  hasCached(contestId) {
    return contestId in this.contestMap;
  }

  get(contestId) {
    return this.contestMap[contestId];
  }

  update(contest) {
    this.contestMap[contest.id] = contest;
  }
}

export { Contests };
