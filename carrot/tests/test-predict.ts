import predict, { PredictResult } from '../src/background/predict.js';

import { DataRow, readTestData, dataRowsToContestants } from './rounds.ts';
import { assertEquals } from './asserts.ts';

const KNOWN_INACCURATE_PREDICTIONS =
  [ 'round-1352-640-div4' // Inaccurate after Github #53
  ]

function expectedDeltas(rows: DataRow[]): Map<string, number> {
  return new Map(rows.map((row) => [row.handle, row.trueDelta]));
}

function predictedDeltas(rows: DataRow[]): Map<string, number> {
  const contestants = dataRowsToContestants(rows);
  const results: PredictResult[] = predict(contestants);
  return new Map(results.map((result) => [result.handle, result.delta]));
}

for (const data of readTestData()) {
  if (!KNOWN_INACCURATE_PREDICTIONS.includes(data.name)) {
    Deno.test('predict_' + data.name, (): void => {
      assertEquals(predictedDeltas(data.rows), expectedDeltas(data.rows));
    });
  }
}
