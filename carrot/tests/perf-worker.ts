import { Contestant } from '../src/background/predict.js';

import { calcDelta, calculateRealPerfs } from './perf-util.ts';

// Local function to avoid net dependency
function assert(value: boolean) {
  if (!value) {
    throw new Error('Assert failed');
  }
}

// @ts-ignore: DedicatedWorkerGlobalScope
self.onmessage = (e: MessageEvent): void => {
  const contestants: Contestant[] = e.data.contestants;
  const handles: string[] = e.data.handles;

  for (const c of calculateRealPerfs(contestants, handles)) {
    const result = {
      handle: c.handle,
      perf: c.performance === Infinity ? 'Infinity': c.performance,
    };
    let deltaAtPerf;
    if (c.rank === 1) {
      assert(c.performance === Infinity);
      deltaAtPerf = 0;
    } else {
      deltaAtPerf = calcDelta(c, contestants, c.performance);
    }
    assert(deltaAtPerf === 0);
    // @ts-ignore: DedicatedWorkerGlobalScope
    self.postMessage(result);
  }
};
