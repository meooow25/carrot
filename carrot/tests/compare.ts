import * as colors from 'https://deno.land/std/fmt/colors.ts';
import * as api from '../src/background/cf-api.js';
import predict, { Contestant } from '../src/background/predict.js';

/**
 * Compares actual vs calculated rating changes for a given finished rated contest.
 * Matches upto Educational round 87 (1354). New rating system was imposed after that.
 * 
 * $ deno run --allow-net compare.ts <contest-id>
 */

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
    console.error(colors.red(`Delta mismatch for ${diffs.length} contestants:`));
    console.error(colors.red('[handle, old rating, actual delta, calculated delta]'));
    for (const row of diffs.slice(0, 5)) {
      console.error(colors.red('[' + row.join(', ') + ']'));
    }
    if (diffs.length > 5) {
      console.log(colors.red(`...and ${diffs.length - 5} more`));
    }
  } else {
    console.info(colors.green('OK all match'));
  }
}

main();
