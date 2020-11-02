/**
 * Convenience wrapper for user preferences.
 */
export default class UserPrefs {
  constructor(allSettingValues) {
    Object.assign(this, allSettingValues);
  }

  static async create(settings) {
    const allFuncs = [
      'enablePredictDeltas',
      'enableFinalDeltas',
      'enablePrefetchRatings',
      'showColCurrentPerformance',
      'showColPredictedDelta',
      'showColRankUpDelta',
      'showColFinalPerformance',
      'showColFinalDelta',
      'showColRankChange',
    ];
    const entries = await Promise.all(allFuncs.map(async (func) => [func, await settings[func]()]));
    return new UserPrefs(Object.fromEntries(entries));
  }

  checkPredictDeltasEnabled() {
    if (!this.enablePredictDeltas) {
      throw new Error('DISABLED');
    }
  }

  checkFinalDeltasEnabled() {
    if (!this.enableFinalDeltas) {
      throw new Error('DISABLED');
    }
  }

  checkAnyDeltasEnabled() {
    if (!this.enablePredictDeltas && !this.enableFinalDeltas) {
      throw new Error('DISABLED');
    }
  }
}
