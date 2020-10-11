/**
 * Wrapper for all useful contest data.
 */
export class Contest {
  constructor(contest, problems, rows, ratingChanges, fetchTime, isRated) {
    this.contest = contest;
    this.problems = problems;
    this.rows = rows;
    this.ratingChanges = ratingChanges;
    this.fetchTime = fetchTime;
    this.isRated = isRated;
    this.performances = null;  // To be populated by someone who calculates the performances.
  }
}

Contest.IsRated = {
  YES: 'YES',
  NO: 'NO',
  LIKELY: 'LIKELY',
};

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
    let isRated = Contest.IsRated.LIKELY;
    if (contest.phase === 'FINISHED') {
      try {
        ratingChanges = await this.api.contest.ratingChanges(contestId);
        if (ratingChanges && ratingChanges.length > 0) {
          isRated = Contest.IsRated.YES;
        }
      } catch (er) {
        if (er.message.includes('Rating changes are unavailable for this contest')) {
          isRated = Contest.IsRated.NO;
        }
      }
    }
    if (isRated === Contest.IsRated.LIKELY && isOldContest(contest)) {
      isRated = Contest.IsRated.NO;
    }
    const isFinished = isRated === Contest.IsRated.NO || isRated === Contest.IsRated.YES;

    const c = new Contest(contest, problems, rows, ratingChanges, Date.now(), isRated);
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
