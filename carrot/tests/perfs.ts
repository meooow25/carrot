import ProgressBar from 'https://deno.land/x/progress@v1.1.3/mod.ts';
import * as path from 'https://deno.land/std@0.76.0/path/mod.ts';

import { Contestant, RatingCalculator } from '../src/background/predict.js';

import { readTestData as readRoundTestData, dataRowsToContestants } from './rounds.ts';

// Increase to go fast, if you have the cores.
const NUM_WORKERS = 6;
const WORKER_SRC = './perf-worker.ts';

const DATA_DIR = path.join(path.fromFileUrl(import.meta.url), '../data');
const DATA_FILE_REGEX = /^(round-.*)-perfs.json$/;

export class PerfRow {
  constructor(
    readonly handle: string,
    readonly perf: number,
  ) {}

  serialize(): [string, number|'Infinity'] {
    return [this.handle, this.perf === Infinity ? 'Infinity' : this.perf];
  }

  static deserialize(serialized: [string, number|'Infinity']): PerfRow {
    return new PerfRow(serialized[0], serialized[1] === 'Infinity' ? Infinity : serialized[1]);
  }
}

export class PerfData {
  constructor(readonly name: string, readonly rows: PerfRow[]) {}
}

class WaitGroup {
  n: number;
  p: Promise<void>;
  r = () => {};
  constructor(n: number) {
    this.n = n;
    this.p = new Promise<void>((r) => { this.r = r; });
  }
  done(): void {
    if (--this.n === 0) {
      this.r();
    }
  }
  async wait(): Promise<void> {
    await this.p;
  }
}

function makeProgressBar(title: string, total: number): () => void {
  const progress = new ProgressBar({
    title,
    total,
    complete: "=",
    incomplete: "-",
    interval: 100,
  });
  let complete = 0;
  progress.render(complete);
  return () => progress.render(++complete);
}

async function preparePerfs(name: string, contestants: Contestant[]): Promise<PerfRow[]> {
  const wg = new WaitGroup(contestants.length);
  const progressBarInc = makeProgressBar(name, contestants.length);

  const perfs: PerfRow[] = [];
  function dataReceived(data: any) {
    perfs.push(PerfRow.deserialize([data.handle, data.perf]));
    wg.done();
    progressBarInc();
  }

  function makeWorker() {
    const w = new Worker(new URL(WORKER_SRC, import.meta.url).href, { type: 'module' });
    w.onmessage = (e) => dataReceived(e.data);
    w.onerror = console.error;
    w.onmessageerror = console.error;
    return w;
  }

  new RatingCalculator(contestants).reassignRanks();  // Need ranks for rank 1 inf delta check
  const workers = [];
  const perWorker = Math.ceil(contestants.length / NUM_WORKERS);
  for (let i = 0; i < contestants.length; i += perWorker) {
    const handles = contestants.slice(i, i + perWorker).map((c) => c.handle);
    const w = makeWorker();
    w.postMessage({
      contestants,
      handles,
    });
    workers.push(w);
  }

  await wg.wait();
  workers.forEach((w) => w.terminate());

  return perfs;
}

function readDataFromFile(file: string): PerfRow[] {
  const json: [string, number][] = JSON.parse(Deno.readTextFileSync(file));
  return json.map(PerfRow.deserialize);
}

/** Returns all perf data from the data directory */
export function readTestData(): PerfData[] {
  return Array.from(Deno.readDirSync(DATA_DIR))
    .filter((entry) => DATA_FILE_REGEX.test(entry.name))
    .map((entry) =>
        new PerfData(
            entry.name.match(DATA_FILE_REGEX)![1],
            readDataFromFile(path.join(DATA_DIR, entry.name))));
}

async function main() {
  if (Deno.args[0] !== 'prepare') {
    console.error('Usage: deno run --allow-read --allow-write perfs.ts prepare');
    Deno.exit(1);
  }

  const fileNames =
      Array.from(Deno.readDirSync(DATA_DIR)).map((entry) => entry.name);
  for (const data of readRoundTestData()) {
    const fileName = data.name + '-perfs.json';
    if (fileNames.includes(fileName)) {
      console.log(`${fileName} exists, skipping`);
      continue;
    }

    const contestants = dataRowsToContestants(data.rows);
    const perfs = await preparePerfs(data.name, contestants);

    const output = perfs.map((perfRow) => perfRow.serialize());
    Deno.writeTextFileSync(path.join(DATA_DIR, fileName), JSON.stringify(output));
  }
}

if (import.meta.main) {
  main();
}
