import * as settings from './settings.js';

async function setup() {
    const running = document.querySelector('#running');
    running.checked = await settings.showDeltasForRunning();
    running.addEventListener('input', () => settings.showDeltasForRunning(running.checked));

    const finished = document.querySelector('#finished');
    finished.checked = await settings.showDeltasForFinished();
    finished.addEventListener('input', () => settings.showDeltasForFinished(finished.checked));
}

document.addEventListener('DOMContentLoaded', setup);
