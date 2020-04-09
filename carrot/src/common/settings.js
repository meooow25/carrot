import { SYNC } from './storage-wrapper.js';

const ENABLE_PREDICT_DELTAS = 'settings.enablePredictDeltas';
const ENABLE_FINAL_DELTAS = 'settings.enableFetchDeltas';

async function enablePredictDeltas(value) {
  if (value == null) {
    return await SYNC.get(ENABLE_PREDICT_DELTAS, true);
  }
  return await SYNC.set(ENABLE_PREDICT_DELTAS, !!value);
}

async function enableFinalDeltas(value) {
  if (value == null) {
    return await SYNC.get(ENABLE_FINAL_DELTAS, true);
  }
  return await SYNC.set(ENABLE_FINAL_DELTAS, !!value);
}

export { enablePredictDeltas, enableFinalDeltas };
