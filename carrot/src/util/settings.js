import { SYNC } from './storage-wrapper.js';

/**
 * Exports utility functions to get or set user preferences to storage.
 */

const ENABLE_PREDICT_DELTAS = 'settings.enablePredictDeltas';
const ENABLE_FINAL_DELTAS = 'settings.enableFetchDeltas';
const ENABLE_PREFETCH_RATINGS = 'settings.enablePrefetchRatings';

function boolSetterGetter(key, defaultValue) {
  return async (value = undefined) => {
    if (value === undefined) {
      return await SYNC.get(key, !!defaultValue);
    }
    return await SYNC.set(key, !!value);
  };
}

export const enablePredictDeltas = boolSetterGetter(ENABLE_PREDICT_DELTAS, true);
export const enableFinalDeltas = boolSetterGetter(ENABLE_FINAL_DELTAS, true);
export const enablePrefetchRatings = boolSetterGetter(ENABLE_PREFETCH_RATINGS, true);
