import * as settings from '/src/util/settings.js';

async function setup() {
  const predict = document.querySelector('#enable-predict-deltas');
  const final = document.querySelector('#enable-final-deltas');
  const prefetch = document.querySelector('#enable-prefetch-ratings');

  async function update() {
    predict.checked = await settings.enablePredictDeltas();
    final.checked = await settings.enableFinalDeltas();
    prefetch.checked = await settings.enablePrefetchRatings();
    prefetch.disabled = !predict.checked;
  }

  predict.addEventListener('input', async () => {
    await settings.enablePredictDeltas(predict.checked);
    await update();
  });

  final.addEventListener('input', async () => {
    await settings.enableFinalDeltas(final.checked);
    await update();
  });

  prefetch.addEventListener('input', async () => {
    await settings.enablePrefetchRatings(prefetch.checked);
    await update();
  });

  await update();
}

document.addEventListener('DOMContentLoaded', setup);
