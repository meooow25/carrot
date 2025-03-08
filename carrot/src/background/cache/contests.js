import Lock from '../../util/lock.js';

const REFRESH_INTERVAL = 6 * 60 * 60 * 1000;  // 6 hours

const CONTESTS_KEY = 'cache.contests';
const CONTESTS_LAST_ATTEMPT_TIME_KEY = 'cache.contests_last_attempt_time';

/**
 * Cache of contest infos.
 */
export default class Contests {
  constructor(api, storage) {
    this.api = api;
    this.storage = storage;
    this.lock = new Lock();
  }

  async maybeRefreshCache() {
    const inner = async () => {
      const lastAttemptTime = this.storage.get(CONTESTS_LAST_ATTEMPT_TIME_KEY, 0);
      const now = Date.now();
      const refresh = now - lastAttemptTime > REFRESH_INTERVAL;
      if (!refresh) {
        return;
      }
      await this.storage.set(CONTESTS_LAST_ATTEMPT_TIME_KEY, now);
      let contests;
      try {
        contests = await this.api.contestList();
      } catch (er) {
        console.warn('Unable to fetch contest list: ' + er);
        return;
      }
      const contestMap = Object.fromEntries(contests.map((c) => [c.id, c]));
      await this.storage.set(CONTESTS_KEY, contestMap);
    };

    // Not that heavy so simultaneous queries aren't a terrible thing to do, but lock anyway.
    await this.lock.execute(inner);
  }

  async loadContestMap() {
    return await this.storage.get(CONTESTS_KEY, {});
  }

  async list() {
    const contestMap = await this.loadContestMap();
    return Object.values(contestMap);
  }

  async getCached(contestId) {
    const contestMap = await this.loadContestMap();
    return contestMap[contestId];
  }

  async update(contest) {
    const contestMap = await this.loadContestMap();
    contestMap[contest.id] = contest;
    await this.storage.set(CONTESTS_KEY, contestMap);
  }
}
