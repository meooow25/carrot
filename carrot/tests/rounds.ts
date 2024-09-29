import * as path from 'https://deno.land/std@0.76.0/path/mod.ts';

import { Contestant } from '../src/background/predict.js';
import { Api } from '../src/background/cf-api.js';

const DATA_DIR = path.join(path.fromFileUrl(import.meta.url), '../data');
const DATA_FILE_REGEX = /^(round-.*)-data.json$/;

export class DataRow {
  constructor(
    readonly handle: string,
    readonly points: number,
    readonly penalty: number,
    readonly rating: number,
    readonly trueDelta: number,
  ) {}

  serialize(): [string, number, number, number, number] {
    return [this.handle, this.points, this.penalty, this.rating, this.trueDelta];
  }

  static deserialize(serialized: [string, number, number, number, number]): DataRow {
    return new DataRow(...serialized);
  }
}

export class RoundData {
  constructor(readonly name: string, readonly rows: DataRow[]) {}
}

function readDataFromFile(file: string): DataRow[] {
  const json: [string, number, number, number, number][] = JSON.parse(Deno.readTextFileSync(file));
  return json.map(DataRow.deserialize);
}

export function dataRowsToContestants(testData: DataRow[]): Contestant[] {
  return testData.map((row) => new Contestant(row.handle, row.points, row.penalty, row.rating));
}

/** Returns all round data from the data directory */
export function readTestData(): RoundData[] {
  return Array.from(Deno.readDirSync(DATA_DIR))
    .filter((entry) => DATA_FILE_REGEX.test(entry.name))
    .map((entry) =>
        new RoundData(
            entry.name.match(DATA_FILE_REGEX)![1],
            readDataFromFile(path.join(DATA_DIR, entry.name))));
}

async function main() {
  const contestId = Deno.args[1];
  if (Deno.args[0] !== 'download' || !contestId) {
    console.error('Usage: deno run --allow-net --allow-write rounds.ts download <contestId>');
    Deno.exit(1);
  }

  const api = new Api((path, queryParamList) => {
    const url = new URL(location.origin + API_PATH + path);
    for (const [key, value] of queryParamList) {
      url.searchParams.append(key, value);
    }
    const resp = await fetch(url);
    if (resp.status !== 200) {
      throw new Error(`CF API: HTTP error ${resp.status}`)
    }
    const json = await resp.json();
    if (json.status !== 'OK') {
      throw new Error(`CF API: Error: ${json.status}`);
    }
    return json.result;
  });

  const { rows } = await api.contestStandings(contestId);
  const rowMap = new Map<string, any>(rows.map((r: any) => [r.party.members[0].handle, r]));

  const changes = await api.contestRatingChanges(contestId);

  const output = changes.map((c: any) => {
    const row = rowMap.get(c.handle);
    const dataRow =
        new DataRow(c.handle, row.points, row.penalty, c.oldRating, c.newRating - c.oldRating);
    return dataRow.serialize();
  });

  const fileName = `round-${contestId}-data.json`;
  Deno.writeTextFileSync(path.join(DATA_DIR, fileName), JSON.stringify(output));
}

if (import.meta.main) {
  main();
}
