import { SYNC } from './storage-wrapper.js';

const SHOW_DELTAS_FOR_RUNNING = 'settings.running';
const SHOW_DELTAS_FOR_FINISHED = 'settings.finished';

function showDeltasForRunning(value) {
  if (value == null) {
    return SYNC.get(SHOW_DELTAS_FOR_RUNNING, true);
  }
  return SYNC.set(SHOW_DELTAS_FOR_RUNNING, !!value);
}

function showDeltasForFinished(value) {
  if (value == null) {
    return SYNC.get(SHOW_DELTAS_FOR_FINISHED, true);
  }
  return SYNC.set(SHOW_DELTAS_FOR_FINISHED, !!value);
}

export { showDeltasForRunning, showDeltasForFinished };
