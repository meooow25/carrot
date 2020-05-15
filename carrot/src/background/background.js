import { LOCAL } from '../util/storage-wrapper.js';
import * as settings from '../util/settings.js';
import Contests from './cache/contests.js';
import RatingChanges from './cache/rating-changes.js';
import Ratings from './cache/ratings.js';
import TopLevelCache from './cache/top-level-cache.js';
import predict, { Contestant, PredictResult } from './predict.js';
import PredictResponse from './predict-response.js';
import UserPrefs from './user-prefs.js';
import * as api from './cf-api.js';

const DEBUG_FORCE_PREDICT = false;

const UNRATED_HINTS = ['unrated', 'fools', 'q#', 'kotlin', 'marathon', 'team'];
const EDU_ROUND_RATED_THRESHOLD = 2100;
const RATING_PENDING_MAX_DAYS = 3;

const CONTESTS = new Contests(api);
const RATING_CHANGES = new RatingChanges(api);
const RATINGS = new Ratings(api, LOCAL);
const TOP_LEVEL_CACHE = new TopLevelCache();

browser.runtime.onMessage.addListener(listener);

async function listener(message) {
  try {
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
  } catch (er) {
    console.error(er);
    throw er;
  }
}

// Prediction related code starts.

function isUnratedByName(contestName) {
  const lower = contestName.toLowerCase();
  return UNRATED_HINTS.some((hint) => lower.includes(hint));
}

function checkRatedByName(contestName) {
  if (isUnratedByName(contestName)) {
    throw new Error('UNRATED_CONTEST');
  }
}

function checkRatedByTeam(rows) {
  if (rows.some((row) => row.party.teamId != null || row.party.teamName != null)) {
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
  if (!DEBUG_FORCE_PREDICT && CONTESTS.hasCached(contestId)) {
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

  const { contest, problems_, rows } = await api.contest.standings(contestId);
  const standingsFetchTime = Date.now();
  CONTESTS.update(contest);
  checkRatedByName(contest.name);
  checkRatedByTeam(rows);

  if (!DEBUG_FORCE_PREDICT && contest.phase == 'FINISHED') {
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
  return await getPredictedDeltas(contest, rows, standingsFetchTime);
}

async function getFinalDeltas(contestId) {
  try {
    const ratingChanges = await RATING_CHANGES.fetch(contestId);
    const fetchTime = Date.now();
    if (ratingChanges && ratingChanges.length) {
      const predictResults = [];
      for (const change of ratingChanges) {
        predictResults.push(
          new PredictResult(change.handle, change.oldRating, change.newRating - change.oldRating));
      }
      return new PredictResponse(predictResults, PredictResponse.TYPE_FINAL, fetchTime);
    }
  } catch (er) {
    console.error('Error fetching deltas: ' + er);
  }
  throw new Error('UNRATED_CONTEST');
}

async function getPredictedDeltas(contest, rows, fetchTime) {
  const ratingMap = await RATINGS.fetchCurrentRatings(contest.startTimeSeconds * 1000);
  const isEduRound = contest.name.toLowerCase().includes('educational');
  if (isEduRound) {
    // For educational rounds, standings include contestants for whom the contest is not rated.
    rows = rows.filter((row) => {
      const handle = row.party.members[0].handle;
      return ratingMap[handle] == null || ratingMap[handle] < EDU_ROUND_RATED_THRESHOLD;
    });
  }
  const contestants = rows.map((row) => {
    const handle = row.party.members[0].handle;
    return new Contestant(handle, row.points, row.penalty, ratingMap[handle]);
  });
  const predictResults = predict(contestants);
  return new PredictResponse(predictResults, PredictResponse.TYPE_PREDICTED, fetchTime);
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
