import predict, { Contestant, PredictResult, MAX_RATING_LIMIT, MIN_RATING_LIMIT } from '../src/background/predict.js';
import binarySearch from '../src/util/binsearch.js'

// @ts-ignore: DedicatedWorkerGlobalScope
self.onmessage = (e: MessageEvent): void => {
  const contestants: Contestant[] = e.data.contestants;
  const fastPerfs: Record<string, number | 'Infinity'> = e.data.fastPerfs;

  function replace(handle: string, assumedRating: number) {
    return contestants.map(
      (c) => c.party === handle ? new Contestant(handle, c.points, c.penalty, assumedRating) : c);
  }

  function calcDelta(c: Contestant, assumedRating: number): number {
    const results: PredictResult[] = predict(replace(c.party, assumedRating));
    return results.filter((r) => r.handle === c.party)[0].delta;
  }

  for (const c of contestants) {
    const fastPerf = fastPerfs[c.party];
    if (fastPerfs[c.party] === undefined) {
      continue;
    }
    const result: Record<string, any> = {
      fastPerf,
      deltaAtFastPerf:
          fastPerf === 'Infinity' ? c.rank === 1 ? 0 : '-Infinity' : calcDelta(c, fastPerf),
      perf:
          c.rank === 1 ?
          'Infinity' :
          binarySearch(
              MIN_RATING_LIMIT, MAX_RATING_LIMIT,
              (assumedRating: number) => calcDelta(c, assumedRating) <= 0),
    };
    result.deltaAtPerf = c.rank === 1 ? 0 : calcDelta(c, result.perf),

    // @ts-ignore: DedicatedWorkerGlobalScope
    self.postMessage(result);
  }
};
