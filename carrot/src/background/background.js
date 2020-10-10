import { LOCAL } from '../util/storage-wrapper.js';
import * as settings from '../util/settings.js';
import Contests from './cache/contests.js';
import { ContestsComplete } from './cache/contests-complete.js';
import Ratings from './cache/ratings.js';
import TopLevelCache from './cache/top-level-cache.js';
import predict, { Contestant, PredictResult } from './predict.js';
import PredictResponse from './predict-response.js';
import UserPrefs from './user-prefs.js';
import * as api from './cf-api.js';

const DEBUG_FORCE_PREDICT = false;

const UNRATED_HINTS = ['unrated', 'fools', 'q#', 'kotlin', 'marathon', 'team'];
const EDU_ROUND_RATED_THRESHOLD = 2100;

const CONTESTS = new Contests(api);
const RATINGS = new Ratings(api, LOCAL);
const CONTESTS_COMPLETE = new ContestsComplete(api);
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

  if (CONTESTS.hasCached(contestId)) {
    const contest = CONTESTS.get(contestId);
    checkRatedByName(contest.name);
  }

  const contest = await CONTESTS_COMPLETE.fetch(contestId);
  CONTESTS.update(contest.contest);
  if (contest.isDefinitelyNotRated) {
    throw new Error('UNRATED_CONTEST');
  }
  checkRatedByName(contest.contest.name);
  checkRatedByTeam(contest.rows);

  if (!DEBUG_FORCE_PREDICT && contest.isFinished) {
    prefs.checkFinalDeltasEnabled();
    return getFinal(contest);
  }

  prefs.checkPredictDeltasEnabled();
  return await getPredicted(contest);
}

function predictForRows(rows, ratingBeforeContest) {
  const contestants = rows.map((row) => {
    const handle = row.party.members[0].handle;
    return new Contestant(handle, row.points, row.penalty, ratingBeforeContest[handle]);
  });
  return predict(contestants, true);
}

function getFinal(contest) {
  // Calculate and save the performances on the contest object if not already saved.
  if (contest.performances == null) {
    const ratingBeforeContest =
        Object.fromEntries(contest.ratingChanges.map((c) => [c.handle, c.oldRating]));
    const rows = contest.rows.filter((row) => {
      const handle = row.party.members[0].handle;
      return ratingBeforeContest[handle] != null;
    });
    const predictResultsForPerf = predictForRows(rows, ratingBeforeContest);
    contest.performances = new Map(predictResultsForPerf.map((r) => [r.handle, r.performance]));
  }

  const predictResults = [];
  for (const change of contest.ratingChanges) {
    predictResults.push(
        new PredictResult(
            change.handle, change.oldRating, change.newRating - change.oldRating,
            contest.performances.get(change.handle)));
  }
  return new PredictResponse(predictResults, PredictResponse.TYPE_FINAL, contest.fetchTime);
}

async function getPredicted(contest) {
  const ratingMap = await RATINGS.fetchCurrentRatings(contest.contest.startTimeSeconds * 1000);
  const isEduRound = contest.contest.name.toLowerCase().includes('educational');
  let rows = contest.rows;
  if (isEduRound) {
    // For educational rounds, standings include contestants for whom the contest is not rated.
    rows = contest.rows.filter((row) => {
      const handle = row.party.members[0].handle;
      return ratingMap[handle] == null || ratingMap[handle] < EDU_ROUND_RATED_THRESHOLD;
    });
  }
  const predictResults = predictForRows(rows, ratingMap);
  return new PredictResponse(predictResults, PredictResponse.TYPE_PREDICTED, contest.fetchTime);
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
