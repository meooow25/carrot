import * as colors from 'https://deno.land/std@0.76.0/fmt/colors.ts';
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

  const rating = new Map<string, {old: number, new: number}>(
    ratingChanges.map((r: any) => [r.handle, { old: r.oldRating, new: r.newRating }]));

  console.info('Fetching standings...');
  let { rows } = await api.contest.standings(contestId);
  console.info('  Fetched ' + rows.length + ' rows');
  rows = rows.filter((row: any) => row.party.members[0].handle in rating);
  console.info('  ' + rows.length + ' rows retained from rating change list');

  console.info('Calculating deltas...');
  const contestants = rows.map((row: any) => {
    const handle = row.party.members[0].handle;
    return new Contestant(handle, row.points, row.penalty, rating.get(handle)!.old);
  });
  const predictResults = predict(contestants);

  const diffs = [];
  const diffCounter = new Map();
  for (const res of predictResults) {
    const actualDelta = rating.get(res.handle)!.new - rating.get(res.handle)!.old;
    if (res.delta !== actualDelta) {
      diffs.push([res.handle, rating.get(res.handle)!.old, actualDelta, res.delta]);
    }
    const diff = res.delta - actualDelta;
    diffCounter.set(diff, (diffCounter.get(diff) ?? 0) + 1);
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
    console.log(colors.red('Difference counts:'));
    const diffCounterSorted = new Map(Array.from(diffCounter.entries()).sort((a, b) => b[1] - a[1]));
    console.log(diffCounterSorted);
  } else {
    console.info(colors.green('OK all match'));
  }
}

if (import.meta.main) {
  main();
}
