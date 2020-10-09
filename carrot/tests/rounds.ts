import { Contestant } from "../src/background/predict.js";

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
  const bytes = Deno.readFileSync(file);
  const json  = JSON.parse(new TextDecoder("utf-8").decode(bytes));
  return json.map((j: [string, number, number, number, number]) => new DataRow(...j));
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
