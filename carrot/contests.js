const REFRESH_INTERVAL = 60 * 60 * 1000;  // 1 hour

/**
 * In-memory cache of contest infos.
 */
class Contests {
  constructor(api) {
    this.api = api;
    this.contestMap = {};
    this.refresh();
  }

  async refresh() {
    try {
      const contests = await this.api.contest.list();
      const contestMap = {};
      for (const c of contests) {
        contestMap[c.id] = c;
      }
      this.contestMap = contestMap;
    } catch (er) {
      console.warn('Unable to fetch contest list: ' + er);
    }
    setTimeout(this.refresh, REFRESH_INTERVAL);
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
