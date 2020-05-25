import * as api from '../src/background/cf-api.js';
import predict, { Contestant } from '../src/background/predict.js';

async function main() {
  const contestId = Deno.args[0];
  if (!contestId || isNaN(parseInt(contestId))) {
    console.error('Missing or bad contest ID');
    return;
  }

  console.info('Contest ' + contestId);
  console.info('Fetching rating changes...');
  const ratingChanges = await api.contest.ratingChanges(contestId);
  if (ratingChanges.length) {
    console.log('  Fetched ' + ratingChanges.length + ' rating changes');
  } else {
    console.error('Empty rating change list');
    return;
  }

  const rating = Object.fromEntries(
    ratingChanges.map((r: any) => [r.handle, { old: r.oldRating, new: r.newRating }]));

  console.info('Fetching standings...');
  let { contest_, problems_, rows } = await api.contest.standings(contestId);
  console.info('  Fetched ' + rows.length + ' rows');
  rows = rows.filter((row: any) => row.party.members[0].handle in rating);
  console.info('  ' + rows.length + ' rows retained from rating change list');

  console.info('Calculating deltas...');
  const contestants = rows.map((row: any) => {
    const handle = row.party.members[0].handle;
    return new Contestant(handle, row.points, row.penalty, rating[handle].old);
  });
  const predictResults = predict(contestants);

  const diffs = [];
  for (const res of predictResults) {
    const actualDelta = rating[res.handle].new - rating[res.handle].old;
    if (res.delta != actualDelta) {
      diffs.push([res.handle, rating[res.handle].old, actualDelta, res.delta]);
    }
  }
  if (diffs.length) {
    console.error(`Delta mismatch for ${diffs.length} contestants:`);
    console.error('[handle, old rating, actual delta, calculated delta]');
    console.error(diffs);
  } else {
    console.info('OK all match');
  }
}

main();
