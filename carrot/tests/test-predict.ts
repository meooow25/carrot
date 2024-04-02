import predict, { PredictResult } from '../src/background/predict.js';

import { DataRow, readTestData, dataRowsToContestants } from './rounds.ts';
import { assertEquals } from './asserts.ts';

function expectedDeltas(rows: DataRow[]): Map<string, number> {
  return new Map(rows.map((row) => [row.handle, row.trueDelta]));
}

function predictedDeltas(rows: DataRow[]): Map<string, number> {
  const contestants = dataRowsToContestants(rows);
  const results: PredictResult[] = predict(contestants);
  return new Map(results.map((result) => [result.handle, result.delta]));
}

for (const data of readTestData()) {
  Deno.test('predict_' + data.name, (): void => {
    assertEquals(predictedDeltas(data.rows), expectedDeltas(data.rows));
  })
}
