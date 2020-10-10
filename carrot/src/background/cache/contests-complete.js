/**
 * Wrapper for all useful contest data.
 */
export class Contest {
  constructor(contest, problems, rows, ratingChanges, fetchTime, isFinished, isDefinitelyNotRated) {
    this.contest = contest;
    this.problems = problems;
    this.rows = rows;
    this.ratingChanges = ratingChanges;
    this.fetchTime = fetchTime;
    this.isFinished = isFinished;
    this.isDefinitelyNotRated = isDefinitelyNotRated;
    this.performances = undefined;  // To be populated by someone who calculates the performances.
  }
}

const RATING_PENDING_MAX_DAYS = 3;

function isOldContest(contest) {
  const daysSinceContestEnd =
    (Date.now() / 1000 - contest.startTimeSeconds - contest.durationSeconds) / (60 * 60 * 24);
  return daysSinceContestEnd > RATING_PENDING_MAX_DAYS;
}

const MAX_FINISHED_CONTESTS_TO_CACHE = 15;

/**
 * Fetches complete contest information from the API. Caches finished contests in memory.
 */
export class ContestsComplete {
  constructor(api) {
    this.api = api;

    // Cache of finished contests
    this.contests = new Map();
    this.contestIds = [];
  }

  async fetch(contestId) {
    if (this.contests.has(contestId)) {
      return this.contests.get(contestId);
    }

    const { contest, problems, rows } = await this.api.contest.standings(contestId);
    let ratingChanges;
    let isDefinitelyRated = false;
    let isDefinitelyNotRated = false;
    if (contest.phase == 'FINISHED') {
      try {
        ratingChanges = await this.api.contest.ratingChanges(contestId);
        if (ratingChanges && ratingChanges.length > 0) {
          isDefinitelyRated = true;
        }
      } catch (er) {
        if (er.message.includes('Rating changes are unavailable for this contest')) {
          isDefinitelyNotRated = true;
        }
      }
    }
    if (!isDefinitelyNotRated && !isDefinitelyRated && isOldContest(contest)) {
      isDefinitelyNotRated = true;
    }
    const isFinished = isDefinitelyRated || isDefinitelyNotRated;

    const c =
        new Contest(
            contest, problems, rows, ratingChanges, Date.now(), isFinished, isDefinitelyNotRated);
    if (isFinished) {
      this.contests.set(contestId, c);
      this.contestIds.push(contestId);
      if (this.contestIds.length > MAX_FINISHED_CONTESTS_TO_CACHE) {
        this.contests.delete(this.contestIds.shift());
      }
    }

    return c;
  }
}
