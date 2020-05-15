import { FFTConv } from '../util/conv.js';

/**
 * Rating calculation code adapted from TLE at
 * https://github.com/cheran-senthil/TLE/blob/master/tle/util/ranklist/rating_calculator.py
 * originally developed by algmyr (https://github.com/algmyr) based on code by Mike Mirzayanov at
 * https://codeforces.com/contest/1/submission/13861109.
 * 
 * The algorithm uses convolution via FFT for fast calculation.
 */

const PRINT_PERFORMANCE = false;
const DEFAULT_RATING = 1500;

class Contestant {
  constructor(party, points, penalty, rating) {
    this.party = party;
    this.points = points;
    this.penalty = penalty;
    this.rating = rating;
    this.effectiveRating = rating == null ? DEFAULT_RATING : rating;
    this.rank = undefined;
    this.delta = undefined;
  }
}

class PredictResult {
  constructor(handle, rating, delta) {
    this.handle = handle;
    this.rating = rating;
    this.delta = delta;
  }

  get effectiveRating() {
    return this.rating == null ? DEFAULT_RATING : this.rating;
  }
}

const MAX_RATING_LIMIT = 6000;
const MIN_RATING_LIMIT = -500;
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
    this.seed = undefined;
  }

  calculate() {
    const startTime = performance.now();
    this.calcSeed();
    this.reassignRanks();
    this.calcDeltas();
    this.adjustDeltas();
    const endTime = performance.now();
    if (PRINT_PERFORMANCE) {
      console.info(`Deltas calculated in ${endTime - startTime}ms.`)
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
    this.contestants.sort((a, b) => a.points != b.points ? b.points - a.points : a.penalty - b.penalty);
    let lastPoints, lastPenalty, rank;
    for (let i = this.contestants.length - 1; i >= 0; i--) {
      const c = this.contestants[i];
      if (c.points != lastPoints || c.penalty != lastPenalty) {
        lastPoints = c.points;
        lastPenalty = c.penalty;
        rank = i + 1;
      }
      c.rank = rank;
    }
  }

  calcDeltas() {
    for (const c of this.contestants) {
      const seed = this.getSeed(c.effectiveRating, c.effectiveRating);
      const midRank = Math.sqrt(c.rank * seed);
      const needRating = this.rankToRating(midRank, c.effectiveRating);
      c.delta = Math.trunc((needRating - c.effectiveRating) / 2);
    }
  }

  rankToRating(rank, selfRating) {
    let [left, right] = [1, MAX_RATING_LIMIT];
    while (right - left > 1) {
      const mid = Math.floor((left + right) / 2);
      if (this.getSeed(mid, selfRating) < rank) {
        right = mid;
      } else {
        left = mid;
      }
    }
    return left;
  }

  adjustDeltas() {
    this.contestants.sort((a, b) => b.effectiveRating - a.effectiveRating);
    const n = this.contestants.length;
    {
      const deltaSum = this.contestants.reduce((a, b) => a + b.delta, 0);
      const inc = Math.trunc(-deltaSum / n) - 1;
      for (const c of this.contestants) {
        c.delta += inc;
      }
    }
    {
      const zeroSumCount = Math.min(4 * Math.round(Math.sqrt(n)), n);
      const deltaSum = this.contestants.slice(0, zeroSumCount).reduce((a, b) => a + b.delta, 0);
      const inc = Math.min(Math.max(Math.trunc(-deltaSum / zeroSumCount), -10), 0);
      for (const c of this.contestants) {
        c.delta += inc;
      }
    }
  }
}

function predict(contestants) {
  new RatingCalculator(contestants).calculate();
  return contestants.map(c => new PredictResult(c.party, c.rating, c.delta));
}

export { Contestant, PredictResult, predict };
