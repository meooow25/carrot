/**
 * Convenience wrapper for user preferences.
 */
export default class UserPrefs {
  constructor(enablePredictDeltas, enableFinalDeltas, enablePrefetchRatings) {
    this.enablePredictDeltas = enablePredictDeltas;
    this.enableFinalDeltas = enableFinalDeltas;
    this.enablePrefetchRatings = enablePrefetchRatings;
  }

  static async create(settings) {
    return new UserPrefs(
      await settings.enablePredictDeltas(),
      await settings.enableFinalDeltas(),
      await settings.enablePrefetchRatings());
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
