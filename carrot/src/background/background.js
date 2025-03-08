import { LOCAL } from '../util/storage-wrapper.js';
import * as settings from '../util/settings.js';
import Contests from './cache/contests.js';
import { Contest, ContestsComplete } from './cache/contests-complete.js';
import Ratings from './cache/ratings.js';
import TopLevelCache from './cache/top-level-cache.js';
import predict, { Contestant, PredictResult } from './predict.js';
import PredictResponse from './predict-response.js';
import { Api } from './cf-api.js';
import compareVersions from '../util/version-compare.js';

const DEBUG_FORCE_PREDICT = false;

const UNRATED_HINTS = ['unrated', 'fools', 'q#', 'kotlin', 'marathon', 'teams'];
const EDU_ROUND_RATED_THRESHOLD = 2100;

const API = new Api(fetchFromContentScript);
const CONTESTS = new Contests(API, LOCAL);
const RATINGS = new Ratings(API, LOCAL);
const CONTESTS_COMPLETE = new ContestsComplete(API, LOCAL);
const TOP_LEVEL_CACHE = new TopLevelCache();

/* ----------------------------------------------- */
/*   Message listener                              */
/* ----------------------------------------------- */

browser.runtime.onMessage.addListener((message, sender) => {
  let responsePromise;
  if (message.type === 'PREDICT') {
    console.info('Received message: %o', message);
    responsePromise = getDeltas(message.contestId);
  } else if (message.type === 'PING') {
    console.info('Received message: %o', message);
    responsePromise = Promise.all([maybeUpdateContestList(), maybeUpdateRatings()]);
  } else if (message.type === 'SET_ERROR_BADGE') {
    console.info('Received message: %o', message);
    setErrorBadge(sender);
    responsePromise = Promise.resolve();
  } else {
    return;
  }
  return responsePromise.catch((e) => {
    console.error(e);
    throw e;
  });
});

/* ----------------------------------------------- */
/*   Content script fetch                          */
/* ----------------------------------------------- */

async function fetchFromContentScript(path, queryParamList) {
  const tabs = await browser.tabs.query({
    // This is the same as host permissions in the manifest
    url: ['*://*.codeforces.com/*'],
  });

  if (tabs.length === 0) {
    throw new Error('No Codeforces tab open :<');
  }

  // Prefer a loaded tab
  let tab = tabs.find(tab => tab.status === 'complete');
  if (tab === undefined) {
    tab = tabs[0];
  }

  const msg = {
    type: 'API_FETCH',
    path,
    queryParamList,
  };
  return await browser.tabs.sendMessage(tab.id, msg);
}

/* ----------------------------------------------- */
/*   Prediction                                    */
/* ----------------------------------------------- */

function isUnratedByName(contestName) {
  const lower = contestName.toLowerCase();
  return UNRATED_HINTS.some((hint) => lower.includes(hint));
}

function anyRowHasTeam(rows) {
  return rows.some((row) => row.party.teamId != null || row.party.teamName != null)
}

async function getDeltas(contestId) {
  const prefs = await settings.getPrefs();
  return TOP_LEVEL_CACHE.getOr(contestId, () => calcDeltas(contestId, prefs));
}

async function calcDeltas(contestId, prefs) {
  if (!prefs.enablePredictDeltas && !prefs.enableFinalDeltas) {
    return { result: 'DISABLED' };
  }

  const contestBasic = await CONTESTS.getCached(contestId);
  if (contestBasic !== undefined && isUnratedByName(contestBasic.name)) {
    return { result: 'UNRATED_CONTEST' };
  }

  const contest = await CONTESTS_COMPLETE.fetch(contestId);
  await CONTESTS.update(contest.contest);

  if (contest.isRated === Contest.IsRated.NO) {
    return { result: 'UNRATED_CONTEST' };
  }

  if (!DEBUG_FORCE_PREDICT && contest.isRated === Contest.IsRated.YES) {
    if (!prefs.enableFinalDeltas) {
      return { result: 'DISABLED' };
    }
    return {
      result: 'OK',
      prefs,
      predictResponse: getFinal(contest),
    };
  }

  // Now contest.isRated = LIKELY
  if (isUnratedByName(contest.contest.name)) {
    return { result: 'UNRATED_CONTEST' };
  }
  if (anyRowHasTeam(contest.rows)) {
    return { result: 'UNRATED_CONTEST' };
  }
  if (!prefs.enablePredictDeltas) {
    return { result: 'DISABLED' };
  }
  return {
    result: 'OK',
    prefs,
    predictResponse: await getPredicted(contest),
  };
}

function predictForRows(rows, ratingBeforeContest) {
  const contestants = rows.map((row) => {
    const handle = row.party.members[0].handle;
    return new Contestant(handle, row.points, row.penalty, ratingBeforeContest.get(handle));
  });
  return predict(contestants, true);
}

function getFinal(contest) {
  // Calculate and save the performances on the contest object if not already saved.
  if (contest.performances === null) {
    const ratingBeforeContest = new Map(
      contest.ratingChanges.map((c) => [c.handle, contest.oldRatings[c.handle]]));
    const rows = contest.rows.filter((row) => {
      const handle = row.party.members[0].handle;
      return ratingBeforeContest.has(handle);
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
      // Rated if the user is unrated or has rating below EDU_ROUND_RATED_THRESHOLD
      return !ratingMap.has(handle) || ratingMap.get(handle) < EDU_ROUND_RATED_THRESHOLD;
    });
  }
  const predictResults = predictForRows(rows, ratingMap);
  return new PredictResponse(predictResults, PredictResponse.TYPE_PREDICTED, contest.fetchTime);
}

/* ----------------------------------------------- */
/*   Cache stuff                                   */
/* ----------------------------------------------- */

async function maybeUpdateContestList() {
  const prefs = await settings.getPrefs();
  if (!prefs.enablePredictDeltas && !prefs.enableFinalDeltas) {
    return;
  }
  await CONTESTS.maybeRefreshCache();
}

async function getNearestUpcomingRatedContestStartTime() {
  let nearest = null;
  const now = Date.now();
  const contests = await CONTESTS.list();
  for (const c of contests) {
    const start = (c.startTimeSeconds || 0) * 1000;
    if (start < now || isUnratedByName(c.name)) {
      continue;
    }
    if (nearest === null || start < nearest) {
      nearest = start;
    }
  }
  return nearest;
}

async function maybeUpdateRatings() {
  const prefs = await settings.getPrefs();
  if (!prefs.enablePredictDeltas || !prefs.enablePrefetchRatings) {
    return;
  }
  const startTimeMs = await getNearestUpcomingRatedContestStartTime();
  if (startTimeMs !== null) {
    await RATINGS.maybeRefreshCache(startTimeMs);
  }
}

/* ----------------------------------------------- */
/*   Badge stuff                                   */
/* ----------------------------------------------- */

function setErrorBadge(sender) {
  const tabId = sender.tab.id;
  browser.action.setBadgeText({ text: '!', tabId });
  if (browser.action.setBadgeTextColor) {  // Only works in Firefox
    browser.action.setBadgeTextColor({ color: 'white', tabId });
  }
  browser.action.setBadgeBackgroundColor({ color: 'hsl(355, 100%, 30%)', tabId });
}

/* ----------------------------------------------- */
/*   Bug fixes                                     */
/* ----------------------------------------------- */

browser.runtime.onInstalled.addListener((details) => {
  if (details.previousVersion && compareVersions(details.previousVersion, '0.6.2') <= 0) {
    // Clear cache to remove stale timestamp
    // https://github.com/meooow25/carrot/issues/31
    browser.storage.local.clear();
  }
});
