import FFTConv from '../src/util/conv.js';
import { assertEqualsWithEps, assertThrows } from './asserts.ts';

const EPS = 1e-6;

Deno.test('convolve_ok', (): void => {
  const a = [0.125, 0.25, 0.5];
  const b = [4, 3, 2, 1];
  const fftConv = new FFTConv(8);
  const res = fftConv.convolve(a, b);
  const expected = [0.5, 1.375, 3, 2.125, 1.25, 0.5];
  assertEqualsWithEps(res, expected, EPS);
});

Deno.test('convolve_throwsOnTooLargeInput', (): void => {
  const a = [0.125, 0.25, 0.5, 1, 2, 3];
  const b = [4, 3, 2, 1];
  const fftConv = new FFTConv(8);
  assertThrows(() => fftConv.convolve(a, b));
});

function getRandomArray(size: number, low: number, high: number): number[] {
  const a = new Array(size);
  for (let i = 0; i < size; i++) {
    a[i] = low + Math.random() * (high - low);
  }
  return a;
}

Deno.test('convolve_largeOk', (): void => {
  const a = getRandomArray(5000, -1000, 1000);
  const b = getRandomArray(6000, -1000, 1000);
  const expected: number[] = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      expected[i + j] += a[i] * b[j];
    }
  }
  const fftConv = new FFTConv(a.length + b.length - 1);
  assertEqualsWithEps(fftConv.convolve(a, b), expected, EPS);
});
