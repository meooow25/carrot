import * as api from '../common/cf-api.js';
import * as settings from '../common/settings.js';
import { Contestant, predict } from './predict.js';
import { Contests } from './contests.js';
import { RatingChanges } from './rating-changes.js';
import { Ratings } from './ratings.js';
import { TopLevelCache } from './top-level-cache.js';
import { UserPrefs } from './user-prefs.js';
import { LOCAL } from '../common/storage-wrapper.js';

const DEFAULT_RATING = 1500;
const UNRATED_HINTS = ['unrated', 'fools', 'q#', 'kotlin', 'marathon', 'team'];
const EDU_ROUND_RATED_THRESHOLD = 2100;
const RATING_PENDING_MAX_DAYS = 3;

const CONTESTS = new Contests(api);
const RATING_CHANGES = new RatingChanges(api);
const RATINGS = new Ratings(api, LOCAL);
const TOP_LEVEL_CACHE = new TopLevelCache();

browser.runtime.onMessage.addListener(listener);

async function listener(message) {
  switch (message.type) {
    case 'PREDICT':
      return await getDeltas(message.contestId);
    case 'PING':
      await maybeUpdateContestList();
      await maybeUpdateRatings();
      return;
    default:
      throw new Error('Unknown message type');
  }
}

// Prediction related code starts.

function isUnratedByName(contestName) {
  const lower = contestName.toLowerCase();
   return UNRATED_HINTS.some(hint => lower.includes(hint));
}

function checkRatedByName(contestName) {
  if (isUnratedByName(contestName)) {
    throw new Error('UNRATED_CONTEST');
  }
}

function checkRatedByTeam(rows) {
  if (rows.some(row => row.party.teamId != null || row.party.teamName != null)) {
    throw new Error('UNRATED_CONTEST');
  }
}

function isOldContest(contest) {
  const daysSinceContestEnd =
    (Date.now() / 1000 - contest.startTimeSeconds - contest.durationSeconds) / (60 * 60 * 24);
  return daysSinceContestEnd > RATING_PENDING_MAX_DAYS;
}

async function getDeltas(contestId) {
  if (!TOP_LEVEL_CACHE.hasCached(contestId)) {
    const deltasPromise = calcDeltas(contestId);
    TOP_LEVEL_CACHE.cache(contestId, deltasPromise);
  }
  return await TOP_LEVEL_CACHE.get(contestId);
}

async function calcDeltas(contestId) {
  const prefs = await UserPrefs.create(settings);
  prefs.checkAnyDeltasEnabled();

  // If rating changes are cached, return them.
  if (RATING_CHANGES.hasCached(contestId)) {
    prefs.checkFinalDeltasEnabled();
    return await getFinalDeltas(contestId);
  }

  // If the contest is old, get rating changes and don't try to predict.
  if (CONTESTS.hasCached(contestId)) {
    const contest = CONTESTS.get(contestId);
    checkRatedByName(contest.name);
    if (isOldContest(contest)) {
      prefs.checkFinalDeltasEnabled();
      return await getFinalDeltas(contestId);
    }
  }

  // The contest
  // 1. does not have rating changes cached, and
  // 2. either
  //     a. does not exist in the contest cache, or
  //     b. exists in the contest cache but is not an old contest.
  //
  // Try to get rating changes if the contest is finished else predict.

  const { contest, problems_, rows} = await api.contest.standings(contestId);
  CONTESTS.update(contest);
  checkRatedByName(contest.name);
  checkRatedByTeam(rows);

  if (contest.phase == 'FINISHED') {
    try {
      const deltas = await getFinalDeltas(contestId);
      prefs.checkFinalDeltasEnabled();
      return deltas;
    } catch (er) {
      if (er.message == 'UNRATED_CONTEST') {
        // Not an old contest but missing rating changes, proceed to predict.
      } else {
        throw er;
      }
    }
  }
  prefs.checkPredictDeltasEnabled();
  return await getPredictedDeltas(contest, rows);
}

async function getFinalDeltas(contestId) {
  try {
    const ratingChanges = await RATING_CHANGES.fetch(contestId);
    if (ratingChanges && ratingChanges.length) {
      let deltas = {};
      for (const change of ratingChanges) {
        deltas[change.handle] = change.newRating - change.oldRating;
      }
      return { deltas: deltas, type: 'FINAL' };
    }
  } catch (er) {
    console.error('Error fetching deltas: ' + er);
  }
  throw new Error('UNRATED_CONTEST');
}

function getRating(ratingMap, handle) {
  return ratingMap[handle] != null ? ratingMap[handle] : DEFAULT_RATING;
}

async function getPredictedDeltas(contest, rows) {
  const ratingMap = await RATINGS.fetchCurrentRatings(contest.startTimeSeconds * 1000);
  const isEduRound = contest.name.toLowerCase().includes('educational');
  if (isEduRound) {
    // For educational rounds, standings include contestants who are unrated.
    rows = rows.filter(
      r => getRating(ratingMap, r.party.members[0].handle) < EDU_ROUND_RATED_THRESHOLD);
  }
  const contestants = rows.map(r => {
    const handle = r.party.members[0].handle;
    return new Contestant(handle, r.points, r.penalty, getRating(ratingMap, handle));
  });
  const deltas = predict(contestants);
  return { deltas: deltas, type: 'PREDICTED' };
}

// Prediction related code ends.

// Cache related code starts.

async function maybeUpdateContestList() {
  const prefs = await UserPrefs.create(settings);
  if (!prefs.enablePredictDeltas && !prefs.enableFinalDeltas) {
    return;
  }
  await CONTESTS.maybeRefreshCache();
}

function getNearestUpcomingRatedContestStartTime() {
  let nearest = null;
  const now = Date.now();
  for (const c of CONTESTS.list()) {
    const start = (c.startTimeSeconds || 0) * 1000;
    if (start < now || isUnratedByName(c.name)) {
      continue;
    }
    if (nearest == null || start < nearest) {
      nearest = start;
    }
  }
  return nearest;
}

async function maybeUpdateRatings() {
  const prefs = await UserPrefs.create(settings);
  if (!prefs.enablePredictDeltas || !prefs.enablePrefetchRatings) {
    return;
  }
  const startTimeMs = getNearestUpcomingRatedContestStartTime();
  if (startTimeMs != null) {
    await RATINGS.maybeRefreshCache(startTimeMs);
  }
}

// Cache related code ends.
