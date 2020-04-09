import * as settings from './settings.js';

class UserPrefs {
  constructor(enablePredictDeltas, enableFinalDeltas) {
    this.enablePredictDeltas = enablePredictDeltas;
    this.enableFinalDeltas = enableFinalDeltas;
  }

  static async create() {
    return new UserPrefs(
      await settings.enablePredictDeltas(), await settings.enableFinalDeltas());
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

  checkAnyEnabled() {
    if (!this.enablePredictDeltas && !this.enableFinalDeltas) {
      throw new Error('DISABLED');
    }
  }
}

export { UserPrefs };
