// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
import { AssertionError } from 'https://deno.land/std/testing/asserts.ts';
import { red, green, white, gray, bold } from 'https://deno.land/std/fmt/colors.ts';
import diff, { DiffType, DiffResult } from 'https://deno.land/std/testing/diff.ts';

// These are internal functions from https://deno.land/std/testing/asserts.ts.
// We use these because we add a new assert function that allows an error margin
// when comparing floating point numbers.

const CAN_NOT_DISPLAY = '[Cannot display]';

function format(v: unknown): string {
  let string = Deno.inspect(v);
  if (typeof v == 'string') {
    string = `"${string.replace(/(?=["\\])/g, '\\')}"`;
  }
  return string;
}

function createColor(diffType: DiffType): (s: string) => string {
  switch (diffType) {
    case DiffType.added:
      return (s: string): string => green(bold(s));
    case DiffType.removed:
      return (s: string): string => red(bold(s));
    default:
      return white;
  }
}

function createSign(diffType: DiffType): string {
  switch (diffType) {
    case DiffType.added:
      return '+   ';
    case DiffType.removed:
      return '-   ';
    default:
      return '    ';
  }
}

function buildMessage(diffResult: ReadonlyArray<DiffResult<string>>, eps: number): string[] {
  const messages: string[] = [];
  messages.push('');
  messages.push('');
  const epsToken = `[Eps: ${eps}]`;
  messages.push(
    `    ${gray(bold('[Diff]'))} ${red(bold('Actual'))} / ${green(bold('Expected'))} ${gray(
      bold(epsToken)
    )}`
  );
  messages.push('');
  messages.push('');
  diffResult.forEach((result: DiffResult<string>): void => {
    const c = createColor(result.type);
    messages.push(c(`${createSign(result.type)}${result.value}`));
  });
  messages.push('');

  return messages;
}

function isKeyedCollection(x: unknown): x is Set<unknown> {
  return [Symbol.iterator, 'size'].every((k) => k in (x as Set<unknown>));
}

// New functions below

export function equalWithEps(c: unknown, d: unknown, eps: number): boolean {
  const seen = new Map();
  return (function compare(a: unknown, b: unknown): boolean {
    // Have to render RegExp & Date for string comparison
    // unless it's mistreated as object
    if (
      a &&
      b &&
      ((a instanceof RegExp && b instanceof RegExp) || (a instanceof Date && b instanceof Date))
    ) {
      return String(a) === String(b);
    }
    if (Object.is(a, b)) {
      return true;
    }
    if (a && typeof a === 'number' && b && typeof b === 'number') {
      return Math.abs(a - b) <= eps;
    }
    if (a && typeof a === 'object' && b && typeof b === 'object') {
      if (seen.get(a) === b) {
        return true;
      }
      if (Object.keys(a || {}).length !== Object.keys(b || {}).length) {
        return false;
      }
      if (isKeyedCollection(a) && isKeyedCollection(b)) {
        if (a.size !== b.size) {
          return false;
        }

        let unmatchedEntries = a.size;

        for (const [aKey, aValue] of a.entries()) {
          for (const [bKey, bValue] of b.entries()) {
            /* Given that Map keys can be references, we need
             * to ensure that they are also deeply equal */
            if (
              (aKey === aValue && bKey === bValue && compare(aKey, bKey)) ||
              (compare(aKey, bKey) && compare(aValue, bValue))
            ) {
              unmatchedEntries--;
            }
          }
        }

        return unmatchedEntries === 0;
      }
      const merged = { ...a, ...b };
      for (const key in merged) {
        type Key = keyof typeof merged;
        if (!compare(a && a[key as Key], b && b[key as Key])) {
          return false;
        }
      }
      seen.set(a, b);
      return true;
    }
    return false;
  })(c, d);
}

export function assertEqualsWithEps(
  actual: unknown,
  expected: unknown,
  eps: number,
  msg?: string
): void {
  if (equalWithEps(actual, expected, eps)) {
    return;
  }
  let message = '';
  const actualString = format(actual);
  const expectedString = format(expected);
  try {
    const diffResult = diff(actualString.split('\n'), expectedString.split('\n'));
    message = buildMessage(diffResult, eps).join('\n');
  } catch (e) {
    message = `\n${red(CAN_NOT_DISPLAY)} + \n\n`;
  }
  if (msg) {
    message = msg;
  }
  throw new AssertionError(message);
}

export * from 'https://deno.land/std/testing/asserts.ts';
