import predict, { Contestant, PredictResult } from '../src/background/predict.js';
import { assertEquals, assertEqualsWithEps, assertThrows } from './asserts.ts';

const LARGE_FILE = './carrot/tests/test-predict-data-global-round-7.json';

// [handle, points, penalty, rating, actualDelta]
type TestDataRow = [string, number, number, number | undefined, number];

function expectedDeltas(data: TestDataRow[]): object {
  return Object.fromEntries(data.map((row: any) => [row[0], row[4]]));
}

function predictedDeltas(data: TestDataRow[]): object {
  // data is an array of [handle, points, penalty, rating, actualDelta]
  const contestants = data.map((row: any) => new Contestant(...row.slice(0, 4)));
  const results = predict(contestants);
  return Object.fromEntries(results.map((result: any) => [result.handle, result.delta]));
}

Deno.test('predict_ok', (): void => {
  const data: TestDataRow[] = [
    ['bigbrain', 4000, 10, 3000, -237],
    ['smartguy', 2500, 50, 2400, -175],
    ['ordinaryguy', 1500, 80, 1800, -35],
    ['brick', -100, 300, 500, -50],
    ['alt', 5000, 0, undefined, 514],
    ['luckyguy', 2500, 40, 1800, 121],
    ['unluckyguy', 800, 40, 2000, -145],
  ];

  assertEquals(predictedDeltas(data), expectedDeltas(data));
});

Deno.test('predict_largeOk', (): void => {
  const bytes = Deno.readFileSync(LARGE_FILE);
  const data: TestDataRow[] = JSON.parse(new TextDecoder('utf-8').decode(bytes));

  assertEquals(predictedDeltas(data), expectedDeltas(data));
});
