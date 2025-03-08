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
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day; this should never change when magic is off tbh
const RATING_PENDING_MAX_DAYS = 3;

function isOldContest(contest) {
  const daysSinceContestEnd =
    (Date.now() / 1000 - contest.startTimeSeconds - contest.durationSeconds) / (60 * 60 * 24);
  return daysSinceContestEnd > RATING_PENDING_MAX_DAYS;
}

function valid(fetchTime) {
  let now = new Date();
  // Assume Codeforces Magic lasts from 24 Dec to 11 Jan.
  // https://codeforces.com/blog/entry/110477
  const isMagic =
         now.getMonth() === 11 && now.getDate() >= 24
      || now.getMonth() === 0 && now.getDate() <= 11;

  const duration = isMagic ? MAGIC_CACHE_DURATION : CACHE_DURATION;
  return now.getTime() < fetchTime + duration;
}

const MAX_FINISHED_CONTESTS_TO_CACHE = 15;
const CONTESTS_COMPLETE_KEY = 'cache.contests_complete';

/**
 * Fetches complete contest information from the API. Caches finished contests.
 */
export class ContestsComplete {
  constructor(api, storage) {
    this.api = api;
    this.storage = storage;
  }

  async fetch(contestId) {
    const [contestMap, contestMapIds] = await this.storage.get(CONTESTS_COMPLETE_KEY, [{}, []]);
    const cachedContest = contestMap[contestId];
    if (cachedContest !== undefined && valid(cachedContest.fetchTime)) {
      return cachedContest;
    }

    const { contest, problems, rows } = await this.api.contestStandings(contestId);
    let ratingChanges;
    let oldRatings;
    let isRated = Contest.IsRated.LIKELY;
    const fetchTime = Date.now();
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
        } else {
          throw er;
        }
      }
    }
    if (isRated === Contest.IsRated.LIKELY && isOldContest(contest)) {
      isRated = Contest.IsRated.NO;
    }
    const isFinished = isRated === Contest.IsRated.NO || isRated === Contest.IsRated.YES;

    const c = new Contest(contest, problems, rows, ratingChanges, oldRatings, fetchTime, isRated);

    // If the contest is finished, the contest data doesn't change so cache it.
    // The exception is during new year's magic, when people change handles and handles on the
    // ranklist can become outdated. So cache it only for a small duration.
    // TODO: New users can also change handles upto a week(?) after joining. Is this a big enough
    // issue to stop caching completely?
    if (isFinished) {
      contestMap[contestId] = c;
      contestMapIds.push(contestId);
      if (contestMapIds.length > MAX_FINISHED_CONTESTS_TO_CACHE) {
        const oldestId = contestMapIds.shift();
        delete contestMap[oldestId];
      }
      await this.storage.set(CONTESTS_COMPLETE_KEY, [contestMap, contestMapIds]);
    }

    return c;
  }
}

const FAKE_RATINGS_SINCE_CONTEST = 1360;
const NEW_DEFAULT_RATING = 1400;

function adjustOldRatings(contestId, ratingChanges) {
  const oldRatings = {};
  if (contestId < FAKE_RATINGS_SINCE_CONTEST) {
    for (const change of ratingChanges) {
      oldRatings[change.handle] = change.oldRating;
    }
  } else {
    for (const change of ratingChanges) {
      oldRatings[change.handle] = change.oldRating == 0 ? NEW_DEFAULT_RATING : change.oldRating;
    }
    // Note: This a band-aid for CF's fake ratings (see Github #18).
    // If CF tells us that a user had rating 0, we consider that the user is in fact unrated.
    // This unfortunately means that a user who truly has rating 0 will be considered to have
    // DEFAULT_RATING, but such cases are unlikely compared to the regular presence of unrated
    // users.
  }
  return oldRatings;
}
