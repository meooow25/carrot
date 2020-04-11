const REFRESH_INTERVAL_ON_OK = 60 * 60 * 1000;  // 1 hour
const REFRESH_INTERVAL_ON_ERR = 20 * 60 * 1000  // 20 minutes

/**
 * In-memory cache of contest infos.
 */
class Contests {
  constructor(api) {
    this.api = api;
    this.contestMap = {};
    setTimeout(() => this.refresh(), 100);
  }

  async refresh() {
    let refreshInterval;
    try {
      const contests = await this.api.contest.list();
      const contestMap = {};
      for (const c of contests) {
        contestMap[c.id] = c;
      }
      this.contestMap = contestMap;
      refreshInterval = REFRESH_INTERVAL_ON_OK;
    } catch (er) {
      console.warn('Unable to fetch contest list: ' + er);
      refreshInterval = REFRESH_INTERVAL_ON_ERR;
    }
    setTimeout(() => this.refresh(), refreshInterval);
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
