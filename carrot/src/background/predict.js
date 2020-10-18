import FFTConv from '../util/conv.js';
import binarySearch from '../util/binsearch.js'

/**
 * Rating calculation code adapted from TLE at
 * https://github.com/cheran-senthil/TLE/blob/master/tle/util/ranklist/rating_calculator.py
 * originally developed by algmyr (https://github.com/algmyr) based on code by Mike Mirzayanov at
 * https://codeforces.com/contest/1/submission/13861109.
 *
 * The algorithm uses convolution via FFT for fast calculation.
 * 
 * Calculation of performance, which is the rating at which delta is zero, written with the help
 * of ffao (https://codeforces.com/profile/ffao).
 */

const PRINT_PERFORMANCE = false;
const DEFAULT_RATING = 1400;

export class Contestant {
  constructor(handle, points, penalty, rating) {
    this.handle = handle;
    this.points = points;
    this.penalty = penalty;
    this.rating = rating;
    this.effectiveRating = rating == null ? DEFAULT_RATING : rating;

    this.rank = null;
    this.delta = null;
    this.performance = null;
  }
}

export class PredictResult {
  constructor(handle, rating, delta, performance) {
    this.handle = handle;
    this.rating = rating;
    this.delta = delta;
    this.performance = performance;
  }

  get effectiveRating() {
    return this.rating == null ? DEFAULT_RATING : this.rating;
  }
}

export const MAX_RATING_LIMIT = 6000;
export const MIN_RATING_LIMIT = -500;
const RATING_RANGE_LEN = MAX_RATING_LIMIT - MIN_RATING_LIMIT;
const ELO_OFFSET = RATING_RANGE_LEN;
const RATING_OFFSET = -MIN_RATING_LIMIT;

// The probability of contestant with rating x winning versus contestant with rating y
// is given by ELO_WIN_PROB[y - x + ELO_OFFSET].
const ELO_WIN_PROB = new Array(2 * RATING_RANGE_LEN + 1);
for (let i = -RATING_RANGE_LEN; i <= RATING_RANGE_LEN; i++) {
  ELO_WIN_PROB[i + ELO_OFFSET] = 1 / (1 + Math.pow(10, i / 400));
}

const fftConv = new FFTConv(ELO_WIN_PROB.length + RATING_RANGE_LEN - 1);

class RatingCalculator {
  constructor(contestants) {
    this.contestants = contestants;
    this.seed = null;
    this.adjustment = null;
  }

  calculateDeltas(calcPerfs = false) {
    const startTime = performance.now();
    this.calcSeed();
    this.reassignRanks();
    this.calcDeltas();
    this.adjustDeltas();
    if (calcPerfs) {
      this.calcPerfs();
    }
    const endTime = performance.now();
    if (PRINT_PERFORMANCE) {
      console.info(`Deltas calculated in ${endTime - startTime}ms.`);
    }
  }

  calcSeed() {
    const counts = new Array(RATING_RANGE_LEN).fill(0);
    for (const c of this.contestants) {
      counts[c.effectiveRating + RATING_OFFSET] += 1;
    }
    // Expected rank for a contestant x is 1 + sum of ELO win probabilities of every other
    // contestant versus x.
    // seed[r] is the expected rank of a contestant with rating r, who did not participate in the
    // contest, if he had participated.
    this.seed = fftConv.convolve(ELO_WIN_PROB, counts);
    for (let i = 0; i < this.seed.length; i++) {
      this.seed[i] += 1;
    }
  }

  getSeed(r, exclude) {
    // This returns the expected rank of a contestant with rating r who did not participate in the
    // contest, leaving a single contestant out of the contest whose rating is exclude.
    // Equivalently this is the expected rank of a contestant with true rating exclude, who did
    // participate in the contest, assuming his rating had been r.
    return this.seed[r + ELO_OFFSET + RATING_OFFSET] - ELO_WIN_PROB[r - exclude + ELO_OFFSET];
  }

  reassignRanks() {
    this.contestants.sort(
        (a, b) => a.points !== b.points ? b.points - a.points : a.penalty - b.penalty);
    let lastPoints, lastPenalty, rank;
    for (let i = this.contestants.length - 1; i >= 0; i--) {
      const c = this.contestants[i];
      if (c.points !== lastPoints || c.penalty !== lastPenalty) {
        lastPoints = c.points;
        lastPenalty = c.penalty;
        rank = i + 1;
      }
      c.rank = rank;
    }
  }

  calcDelta(contestant, assumedRating) {
    const c = contestant;
    const seed = this.getSeed(assumedRating, c.effectiveRating);
    const midRank = Math.sqrt(c.rank * seed);
    const needRating = this.rankToRating(midRank, c.effectiveRating);
    const delta = Math.trunc((needRating - assumedRating) / 2);
    return delta;
  }

  calcDeltas() {
    for (const c of this.contestants) {
      c.delta = this.calcDelta(c, c.effectiveRating);
    }
  }

  rankToRating(rank, selfRating) {
    // Finds last rating at which seed >= rank.
    return binarySearch(
      2, MAX_RATING_LIMIT,
      (rating) => this.getSeed(rating, selfRating) < rank) - 1;
  }

  adjustDeltas() {
    this.contestants.sort((a, b) => b.effectiveRating - a.effectiveRating);
    const n = this.contestants.length;
    {
      const deltaSum = this.contestants.reduce((a, b) => a + b.delta, 0);
      const inc = Math.trunc(-deltaSum / n) - 1;
      this.adjustment = inc;
      for (const c of this.contestants) {
        c.delta += inc;
      }
    }
    {
      const zeroSumCount = Math.min(4 * Math.round(Math.sqrt(n)), n);
      const deltaSum = this.contestants.slice(0, zeroSumCount).reduce((a, b) => a + b.delta, 0);
      const inc = Math.min(Math.max(Math.trunc(-deltaSum / zeroSumCount), -10), 0);
      this.adjustment += inc;
      for (const c of this.contestants) {
        c.delta += inc;
      }
    }
  }

  calcPerfs() {
    // This is not perfect, but close enough. The difference is caused by the adjustment value,
    // which can change slightly when the rating of a single user, the user for whom we're
    // calculating performance, varies.
    // Tests on some selected contests show (this perf - true perf) lie in [0, 4].
    for (const c of this.contestants) {
      if (c.rank === 1) {
        c.performance = Infinity;  // Rank 1 always gains rating.
      } else {
        c.performance = binarySearch(
            MIN_RATING_LIMIT, MAX_RATING_LIMIT,
            (assumedRating) => this.calcDelta(c, assumedRating) + this.adjustment <= 0);
      }
    }
  }
}

export default function predict(contestants, calcPerfs = false) {
  new RatingCalculator(contestants).calculateDeltas(calcPerfs);
  return contestants.map((c) => new PredictResult(c.handle, c.rating, c.delta, c.performance));
}
