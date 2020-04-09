import * as settings from './settings.js';

async function setup() {
  const predict = document.querySelector('#enable-predict-deltas');
  predict.checked = await settings.enablePredictDeltas();
  predict.addEventListener('input', () => settings.enablePredictDeltas(predict.checked));

  const final = document.querySelector('#enable-final-deltas');
  final.checked = await settings.enableFinalDeltas();
  final.addEventListener('input', () => settings.enableFinalDeltas(final.checked));
}

document.addEventListener('DOMContentLoaded', setup);
