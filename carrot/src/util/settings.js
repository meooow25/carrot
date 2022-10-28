import { SYNC } from './storage-wrapper.js';

/**
 * Exports utility functions to get or set user preferences to storage.
 */

function boolSetterGetter(key, defaultValue) {
  return async (value = undefined) => {
    if (value === undefined) {
      return await SYNC.get(key, !!defaultValue);
    }
    return await SYNC.set(key, !!value);
  };
}

export const enablePredictDeltas = boolSetterGetter('settings.enablePredictDeltas', true);
export const enableFinalDeltas = boolSetterGetter('settings.enableFetchDeltas', true);
export const enablePrefetchRatings = boolSetterGetter('settings.enablePrefetchRatings', true);
export const showColCurrentPerformance = boolSetterGetter('settings.showColCurrentPerformance', true);
export const showColPredictedDelta = boolSetterGetter('settings.showColPredictedDelta', true);
export const showColRankUpDelta = boolSetterGetter('settings.showColRankUpDelta', true);
export const showColFinalPerformance = boolSetterGetter('settings.showColFinalPerformance', true);
export const showColFinalDelta = boolSetterGetter('settings.showColFinalDelta', true);
export const showColRankChange = boolSetterGetter('settings.showColRankChange', true);

export async function getPrefs() {
  return {
    enablePredictDeltas: await enablePredictDeltas(),
    enableFinalDeltas: await enableFinalDeltas(),
    enablePrefetchRatings: await enablePrefetchRatings(),
    showColCurrentPerformance: await showColCurrentPerformance(),
    showColPredictedDelta: await showColPredictedDelta(),
    showColRankUpDelta: await showColRankUpDelta(),
    showColFinalPerformance: await showColFinalPerformance(),
    showColFinalDelta: await showColFinalDelta(),
    showColRankChange: await showColRankChange(),
  }
}
