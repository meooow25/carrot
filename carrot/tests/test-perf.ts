import ProgressBar from 'https://deno.land/x/progress@v1.1.3/mod.ts';

import predict, { Contestant, PredictResult } from '../src/background/predict.js';

import { RoundData, readTestData, dataRowsToContestants } from './rounds.ts';
import { assertEquals, assertArrayContains } from './asserts.ts';

// Increase to go fast, if you have the cores.
const NUM_WORKERS = 2;
const WORKER_SRC = './perf-worker.ts';

// Deltas calculated with fast perf are usually 0, rarely -1, never worse than that.
const ALLOWED_DELTAS_AT_FAST_PERFS = [-1, 0];

// Fast perfs are at most 4 more than the correct value.
const ALLOWED_PERF_DIFFS = [0, 1, 2, 3, 4];

class WaitGroup {
  n: number;
  p: Promise<void>;
  r = () => {};
  constructor(n: number) {
    this.n = n;
    this.p = new Promise<void>((r) => { this.r = r; });
  }
  done(): void {
    if (--this.n == 0) {
      this.r();
    }
  }
  async wait(): Promise<void> {
    await this.p;
  }
}

function makeProgressBar(total: number): () => void {
  const progress = new ProgressBar({
    total,
    complete: "=",
    incomplete: "-",
    interval: 500,
  });
  let complete = 0;
  progress.render(complete);
  return () => progress.render(++complete);
}

function incCounter<T>(counter: Map<T, number>, key: T) {
  counter.set(key, (counter.get(key) ?? 0) + 1);
}

async function verifyVsNaive(
  contestants: Contestant[],
  fastPerfs: Map<string, number>): Promise<void> {

  const deltasAtFastPerfs = new Map<number, number>();
  const perfDiffs = new Map<number, number>();
  
  const wg = new WaitGroup(contestants.length);
  console.log();
  const progressBarInc = makeProgressBar(contestants.length);

  function dataReceived(data: any) {
    const { fastPerf, deltaAtFastPerf, perf, deltaAtPerf } = data;

    assertEquals(deltaAtPerf, 0);

    assertArrayContains(ALLOWED_DELTAS_AT_FAST_PERFS, [deltaAtFastPerf]);
    incCounter(deltasAtFastPerfs, deltaAtFastPerf);

    const diff = fastPerf - perf;
    assertArrayContains(ALLOWED_PERF_DIFFS, [diff]);
    incCounter(perfDiffs, diff);

    wg.done();
    progressBarInc();
  }

  function makeWorker() {
    const w = new Worker(new URL(WORKER_SRC, import.meta.url).href, { type: 'module' });
    w.onmessage = (e) => dataReceived(e.data);
    w.onerror = console.error;
    w.onmessageerror = console.error;
    return w;
  }

  const workers = [];
  const perWorker = Math.ceil(contestants.length / NUM_WORKERS);
  for (let i = 0; i < contestants.length; i += perWorker) {
    const fastPerfsPiece = Object.fromEntries(
        contestants.slice(i, i + perWorker).map((c) => [c.party, fastPerfs.get(c.party)]));
    const w = makeWorker();
    w.postMessage({
      contestants,
      fastPerfs: fastPerfsPiece,
    });
    workers.push(w);
  }

  await wg.wait();
  workers.forEach((w) => w.terminate());

  const deltasAtFastPerfsEntries =
      Array.from(deltasAtFastPerfs.entries()).sort((a, b) => a[0] - b[0]);
  console.log('deltasAtFastPerfs:');
  console.log(deltasAtFastPerfsEntries);

  const perfDiffsEntries = Array.from(perfDiffs.entries()).sort((a, b) => a[0] - b[0]);
  console.log('perfDiffs:');
  console.log(perfDiffsEntries);
}

async function testPerfs(data: RoundData): Promise<void> {
  const contestants = dataRowsToContestants(data.rows);
  const results: PredictResult[] = predict(contestants.slice(), true);
  const fastPerfs = new Map<string, number>(results.map((r) => [r.handle, r.performance]));
  await verifyVsNaive(contestants, fastPerfs);
}

for (const data of readTestData()) {
  Deno.test('perf_' + data.name, async (): Promise<void> => {
    await testPerfs(data);
  })
}
