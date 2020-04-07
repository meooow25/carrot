import * as api from './cf-api.js';
import * as settings from './settings.js';
import * as store from './storage.js';
import { Contestant, predict } from './predict.js';

const DEFAULT_RATING = 1500;
const UNRATED_HINTS = ['unrated', 'fools', 'q#', 'kotlin', 'marathon', 'team'];
const EDU_ROUND_RATED_THRESHOLD = 2100;
const RATING_PENDING_MAX_DAYS = 3;

browser.runtime.onMessage.addListener(listener);

function listener(message) {
  return getDeltas(message.contestId);
}

function probablyUnrated(contest, rows) {
  const lower = contest.name.toLowerCase();
  return (UNRATED_HINTS.some(hint => lower.includes(hint))
    || rows.some(row => row.party.teamId != null || row.party.teamName != null));
}

function getRating(ratingMap, handle) {
  return ratingMap[handle] != null ? ratingMap[handle] : DEFAULT_RATING;
}

async function getDeltas(contestId) {
  const showForRunning = await settings.showDeltasForRunning();
  const showForFinished = await settings.showDeltasForFinished();
  if (!showForRunning && !showForFinished) {
    throw new Error('DISABLED');
  }
  let { contest, _problems, rows } = await api.contest.standings(contestId);
  if (probablyUnrated(contest, rows)) {
    throw new Error('UNRATED_CONTEST');
  }
  if (contest.phase == 'FINISHED') {
    if (!showForFinished) {
      throw new Error('DISABLED');
    }
    try {
      return getDeltasForFinished(contest);
    } catch (er) {
      if (er.message == 'RECENT_CONTEST') {
        // Recent contest without rating changes, continue and predict.
      } else {
        throw er;
      }
    }
  }
  if (!showForRunning) {
    throw new Error('DISABLED');
  }
  return getDeltasForRunning(contest, rows);
}

async function getDeltasForFinished(contest) {
  let ratingChanges;
  try {
    ratingChanges = await api.contest.ratingChanges(contest.id);
  } catch (er) {
    console.error('Error fetching deltas: ' + er);
  }
  if (ratingChanges && ratingChanges.length) {
    let deltas = {};
    for (const change of ratingChanges) {
      deltas[change.handle] = change.newRating - change.oldRating;
    }
    return { deltas: deltas, type: 'FINAL' };
  }
  const daysSinceContestEnd =
    (Date.now() / 1000 - contest.startTimeSeconds - contest.durationSeconds) / (60 * 60 * 24);
  if (daysSinceContestEnd > RATING_PENDING_MAX_DAYS) {
    // Old contest and no rating changes, assume unrated.
    throw new Error('UNRATED_CONTEST');
  }
  throw new Error('RECENT_CONTEST');
}

async function getDeltasForRunning(contest, rows) {
  const ratingMap = await getUpdatedRatings(contest.startTimeSeconds);
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

async function getUpdatedRatings(startTimeSec) {
  // Forced to use user.ratedList because user.info does not work with a huge list of handles.
  if (!(await store.isCacheFresh(startTimeSec * 1000))) {
    const users = await api.user.ratedList(false);
    const ratingMap = {};
    for (const user of users) {
      ratingMap[user.handle] = user.rating;
    }
    await store.setRatings(ratingMap, Date.now());
  }
  return store.getRatings();
}
