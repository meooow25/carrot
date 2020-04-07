const SHOW_DELTAS_FOR_RUNNING = 'settings.running';
const SHOW_DELTAS_FOR_FINISHED = 'settings.finished';

async function showDeltasForRunning(value) {
    if (value == null) {
        const obj = await browser.storage.sync.get(SHOW_DELTAS_FOR_RUNNING);
        return obj[SHOW_DELTAS_FOR_RUNNING] != null ? obj[SHOW_DELTAS_FOR_RUNNING] : true;
    }
    return browser.storage.sync.set({ [SHOW_DELTAS_FOR_RUNNING]: !!value });
}

async function showDeltasForFinished(value) {
    if (value == null) {
        const obj = await browser.storage.sync.get(SHOW_DELTAS_FOR_FINISHED);
        return obj[SHOW_DELTAS_FOR_FINISHED] != null ? obj[SHOW_DELTAS_FOR_FINISHED] : true;
    }
    return browser.storage.sync.set({ [SHOW_DELTAS_FOR_FINISHED]: !!value });
}

export { showDeltasForRunning, showDeltasForFinished };
