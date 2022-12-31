import Rank from './rank.js';

class PredictResponseRow {
  constructor(delta, rank, performance, newRank, deltaReqForRankUp, nextRank) {
    this.delta = delta;
    this.rank = rank;
    this.performance = performance;

    // For FINAL
    this.newRank = newRank;

    // For PREDICTED
    this.deltaReqForRankUp = deltaReqForRankUp;
    this.nextRank = nextRank;
  }
}

export default class PredictResponse {
  constructor(predictResults, type, fetchTime) {
    PredictResponse.assertTypeOk(type);
    this.rowMap = {};
    this.type = type;
    this.fetchTime = fetchTime;
    this.populateMap(predictResults);
  }

  populateMap(predictResults) {
    for (const result of predictResults) {
      let rank, newRank, deltaReqForRankUp, nextRank;
      switch (this.type) {
        case PredictResponse.TYPE_PREDICTED:
          rank = Rank.forRating(result.rating);
          const effectiveRank = Rank.forRating(result.effectiveRating);
          deltaReqForRankUp = effectiveRank.high - result.effectiveRating;
          nextRank = Rank.RATED[Rank.RATED.indexOf(effectiveRank) + 1] || null;  // null when LGM
          break;
        case PredictResponse.TYPE_FINAL:
          // For an unrated user, user info has missing rating but if the user participates, the
          // oldRating on the ratingChange object is set as the default starting value. So, for
          // FINAL, at the moment rating = effectiveRating always, but keeping the code which works
          // for unrated too, as things should be.
          rank = Rank.forRating(result.rating);
          newRank = Rank.forRating(result.effectiveRating + result.delta);
          break;
        default:
          throw new Error('Unknown prediction type'); // Unexpected
      }
      const performance = {
        value: result.performance === Infinity ? 'Infinity' : result.performance,
        colorClass: Rank.forRating(result.performance).colorClass,
      }
      this.rowMap[result.handle] =
          new PredictResponseRow(
              result.delta, rank, performance, newRank, deltaReqForRankUp, nextRank);
    }
  }

  static assertTypeOk(type) {
    if (!PredictResponse.TYPES.includes(type)) {
      throw new Error('Unknown prediction type: ' + type);
    }
  }
}
PredictResponse.TYPE_PREDICTED = 'PREDICTED';
PredictResponse.TYPE_FINAL = 'FINAL';
PredictResponse.TYPES = [PredictResponse.TYPE_PREDICTED, PredictResponse.TYPE_FINAL];
