import predict, { Contestant, PredictResult, MAX_RATING_LIMIT, MIN_RATING_LIMIT } from '../src/background/predict.js';
import binarySearch from '../src/util/binsearch.js';

export function calcDelta(c: Contestant, contestants: Contestant[], assumedRating: number): number {
  function replace(handle: string, assumedRating: number) {
    return contestants.map(
      (c) => c.handle === handle ? new Contestant(handle, c.points, c.penalty, assumedRating) : c);
  }

  const results: PredictResult[] = predict(replace(c.handle, assumedRating));
  return results.filter((r) => r.handle === c.handle)[0].delta;
}

export function* calculateRealPerfs(contestants: Contestant[], handles: string[]): Generator<Contestant> {
  const handlesSet = new Set(handles);
  for (const c of contestants) {
    if (!handlesSet.has(c.handle)) {
      continue;
    }
    c.performance =
        c.rank === 1 ?
        Infinity :
        binarySearch(
            MIN_RATING_LIMIT, MAX_RATING_LIMIT,
            (assumedRating: number) => calcDelta(c, contestants, assumedRating) <= 0);
    yield c;
  }
}
