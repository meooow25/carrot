import * as settings from './settings.js';

class UserPrefs {
  constructor(enabledForRunning, enabledForFinished) {
    this.enabledForRunning = enabledForRunning;
    this.enabledForFinished = enabledForFinished;
  }

  static async create() {
    return new UserPrefs(
      await settings.showDeltasForRunning(), await settings.showDeltasForFinished());
  }

  checkEnabledForRunning() {
    if (!this.enabledForRunning) {
      throw new Error('DISABLED');
    }
  }

  checkEnabledForFinished() {
    if (!this.enabledForFinished) {
      throw new Error('DISABLED');
    }
  }

  checkEnabledForAny() {
    if (!this.enabledForRunning && !this.enabledForFinished) {
      throw new Error('DISABLED');
    }
  }
}

export { UserPrefs };
