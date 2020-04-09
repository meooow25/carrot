import { SYNC } from './storage-wrapper.js';

const SHOW_DELTAS_FOR_RUNNING = 'settings.running';
const SHOW_DELTAS_FOR_FINISHED = 'settings.finished';

async function showDeltasForRunning(value) {
  if (value == null) {
    return await SYNC.get(SHOW_DELTAS_FOR_RUNNING, true);
  }
  return await SYNC.set(SHOW_DELTAS_FOR_RUNNING, !!value);
}

async function showDeltasForFinished(value) {
  if (value == null) {
    return await SYNC.get(SHOW_DELTAS_FOR_FINISHED, true);
  }
  return await SYNC.set(SHOW_DELTAS_FOR_FINISHED, !!value);
}

export { showDeltasForRunning, showDeltasForFinished };
