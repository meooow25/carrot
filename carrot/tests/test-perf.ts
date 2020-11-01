import predict, { PredictResult } from '../src/background/predict.js';

import { RoundData, readTestData as readRoundTestData, dataRowsToContestants } from './rounds.ts';
import { PerfData, readTestData as readPerfTestData } from './perfs.ts';
import { calcDelta } from './perf-util.ts';
import { assert, assertEquals, assertArrayIncludes } from './asserts.ts';

// Deltas calculated with fast perf are usually 0, rarely -1, never worse than that.
const ALLOWED_DELTAS_AT_FAST_PERFS = [-1, 0];

// Fast perfs are at most 4 more than the correct value.
const ALLOWED_PERF_DIFFS = [0, 1, 2, 3, 4];

function incCounter<T>(counter: Map<T, number>, key: T) {
  counter.set(key, (counter.get(key) ?? 0) + 1);
}

function testPerfs(roundData: RoundData, perfData: PerfData) {
  const contestants = dataRowsToContestants(roundData.rows);
  const results: PredictResult[] = predict(contestants, true);
  const fastPerfs = new Map<string, number>(results.map((r) => [r.handle, r.performance]));

  const realPerfs = new Map(perfData.rows.map((row) => [row.handle, row.perf]));

  const deltasAtFastPerfs = new Map<number, number>();
  const perfDiffs = new Map<number, number>();

  for (const c of contestants) {
    const fastPerf = fastPerfs.get(c.handle)!;
    const realPerf = realPerfs.get(c.handle)!;

    let deltaAtFastPerf;
    if (c.rank === 1) {
      assert(fastPerf === Infinity);
      deltaAtFastPerf = 0;
    } else {
      deltaAtFastPerf = calcDelta(c, contestants, fastPerf);
    }

    assertArrayIncludes(ALLOWED_DELTAS_AT_FAST_PERFS, [deltaAtFastPerf]);
    incCounter(deltasAtFastPerfs, deltaAtFastPerf);

    if (realPerf === Infinity) {
      assertEquals(fastPerf, realPerf);
      incCounter(perfDiffs, 0);
    } else {
      const diff = fastPerf - realPerf;
      assertArrayIncludes(ALLOWED_PERF_DIFFS, [diff]);
      incCounter(perfDiffs, diff);
    }
  }

  console.log();
  const deltasAtFastPerfsEntries =
      Array.from(deltasAtFastPerfs.entries()).sort((a, b) => a[0] - b[0]);
  console.log('deltasAtFastPerfs:');
  console.log(deltasAtFastPerfsEntries);

  const perfDiffsEntries = Array.from(perfDiffs.entries()).sort((a, b) => a[0] - b[0]);
  console.log('perfDiffs:');
  console.log(perfDiffsEntries);
}

const perfTestData = new Map(readPerfTestData().map((data) => [data.name, data]));
for (const roundData of readRoundTestData()) {
  Deno.test('perf_' + roundData.name, () => {
    const perfData = perfTestData.get(roundData.name)!;
    testPerfs(roundData, perfData);
  })
}
