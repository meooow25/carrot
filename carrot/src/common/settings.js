import { SYNC } from './storage-wrapper.js';

const ENABLE_PREDICT_DELTAS = 'settings.enablePredictDeltas';
const ENABLE_FINAL_DELTAS = 'settings.enableFetchDeltas';
const ENABLE_PREFETCH_RATINGS = 'settings.enablePrefetchRatings';

function boolSetterGetter(key, defaultValue) {
  return async (value) => {
    if (value == null) {
      return await SYNC.get(key, !!defaultValue);
    }
    return await SYNC.set(key, !!value);
  };
}

const enablePredictDeltas = boolSetterGetter(ENABLE_PREDICT_DELTAS, true);
const enableFinalDeltas = boolSetterGetter(ENABLE_FINAL_DELTAS, true);
const enablePrefetchRatings = boolSetterGetter(ENABLE_PREFETCH_RATINGS, true);

export { enablePredictDeltas, enableFinalDeltas, enablePrefetchRatings };
