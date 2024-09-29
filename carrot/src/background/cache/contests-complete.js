/**
 * Wrapper for all useful contest data.
 */
export class Contest {
  constructor(contest, problems, rows, ratingChanges, oldRatings, fetchTime, isRated) {
    this.contest = contest;
    this.problems = problems;
    this.rows = rows;
    this.ratingChanges = ratingChanges; // undefined if isRated is not YES
    this.oldRatings = oldRatings; // undefined if isRated is not YES
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

const MAGIC_CACHE_DURATION = 5 * 60 * 1000; // 5 mins
const RATING_PENDING_MAX_DAYS = 3;

function isOldContest(contest) {
  const daysSinceContestEnd =
    (Date.now() / 1000 - contest.startTimeSeconds - contest.durationSeconds) / (60 * 60 * 24);
  return daysSinceContestEnd > RATING_PENDING_MAX_DAYS;
}

function isMagicOn() {
  let now = new Date();
  // Assume Codeforces Magic lasts from 24 Dec to 11 Jan.
  // https://codeforces.com/blog/entry/110477
  return now.getMonth() === 11 && now.getDate() >= 24
      || now.getMonth() === 0 && now.getDate() <= 11;
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

    const { contest, problems, rows } = await this.api.contestStandings(contestId);
    let ratingChanges;
    let oldRatings;
    let isRated = Contest.IsRated.LIKELY;
    if (contest.phase === 'FINISHED') {
      try {
        ratingChanges = await this.api.contestRatingChanges(contestId);
        if (ratingChanges) {
          if (ratingChanges.length > 0) {
            isRated = Contest.IsRated.YES;
            oldRatings = adjustOldRatings(contestId, ratingChanges);
          } else {
            ratingChanges = undefined; // Reset to undefined if it was an empty array
          }
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

    const c = new Contest(contest, problems, rows, ratingChanges, oldRatings, Date.now(), isRated);

    // If the contest is finished, the contest data doesn't change so cache it.
    // The exception is during new year's magic, when people change handles and handles on the
    // ranklist can become outdated. So cache it only for a small duration.
    // TODO: New users can also change handles upto a week(?) after joining. Is this a big enough
    // issue to stop caching completely?
    if (isFinished) {
      this.contests.set(contestId, c);
      this.contestIds.push(contestId);
      if (this.contestIds.length > MAX_FINISHED_CONTESTS_TO_CACHE) {
        this.contests.delete(this.contestIds.shift());
      }
      if (isMagicOn()) {
        setTimeout(() => {
          this.contests.delete(contestId);
          this.contestIds = this.contestIds.filter((cid) => cid !== contestId);
        },
        MAGIC_CACHE_DURATION);
      }
    }

    return c;
  }
}

const FAKE_RATINGS_SINCE_CONTEST = 1360;
const NEW_DEFAULT_RATING = 1400;

function adjustOldRatings(contestId, ratingChanges) {
  const oldRatings = new Map();
  if (contestId < FAKE_RATINGS_SINCE_CONTEST) {
    for (const change of ratingChanges) {
      oldRatings.set(change.handle, change.oldRating);
    }
  } else {
    for (const change of ratingChanges) {
      oldRatings.set(change.handle, change.oldRating == 0 ? NEW_DEFAULT_RATING : change.oldRating);
    }
    // Note: This a band-aid for CF's fake ratings (see Github #18).
    // If CF tells us that a user had rating 0, we consider that the user is in fact unrated.
    // This unfortunately means that a user who truly has rating 0 will be considered to have
    // DEFAULT_RATING, but such cases are unlikely compared to the regular presence of unrated
    // users.
  }
  return oldRatings;
}
