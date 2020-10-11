import { Contestant } from '../src/background/predict.js';
import * as api from '../src/background/cf-api.js';

const DATA_FILE_REGEX = /^(round-.*)-data.json$/;

export class DataRow {
  constructor(
    readonly handle: string,
    readonly points: number,
    readonly penalty: number,
    readonly rating: number,
    readonly trueDelta: number,
  ) {}
}

export class RoundData {
  constructor(readonly name: string, readonly rows: DataRow[]) {}
}

function readDataFromFile(file: string | URL): DataRow[] {
  const json: [string, number, number, number, number][] = JSON.parse(Deno.readTextFileSync(file));
  return json.map((j) => new DataRow(...j));
}

export function dataRowsToContestants(testData: DataRow[]): Contestant[] {
  return testData.map((row) => new Contestant(row.handle, row.points, row.penalty, row.rating));
}

export function readTestData(): RoundData[] {
  return Array.from(Deno.readDirSync(new URL('.', import.meta.url)))
    .filter((entry) => DATA_FILE_REGEX.test(entry.name))
    .map((entry) =>
        new RoundData(
            entry.name.match(DATA_FILE_REGEX)![1].replaceAll('-', '_'),
            readDataFromFile(new URL(entry.name, import.meta.url))));
}

async function main() {
  const contestId = Deno.args[1];
  if (Deno.args[0] !== 'download' || !contestId) {
    console.error('Usage: deno run --allow-net --allow-write rounds.ts download <contestId>');
    Deno.exit(1);
  }

  const { rows } = await api.contest.standings(contestId);
  const rowMap = new Map<string, any>(rows.map((r: any) => [r.party.members[0].handle, r]));

  const changes = await api.contest.ratingChanges(contestId);

  const output = changes.map((c: any) => {
    const row = rowMap.get(c.handle);
    return [c.handle, row.points, row.penalty, c.oldRating, c.newRating - c.oldRating];
  });

  const fileName = `round-${contestId}-data.json`;
  Deno.writeTextFileSync(new URL(fileName, import.meta.url), JSON.stringify(output));
}

if (import.meta.main) {
  main();
}
