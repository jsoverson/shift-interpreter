import { expect } from 'chai';
import { parseScript } from 'shift-parser';
import { Interpreter } from '../src/interpreter';
import { BasicContext } from '../src/context';
import deepEqual from 'deep-equal';

import DEBUG from 'debug';

const debug = DEBUG('shift:interpreter:test');

const evaluate = require('./nostrict-eval.js').eval;

export interface Result {
  actual: any;
  actualError: Error;
  expected: any;
  expectedError: Error;
  src: string;
  success: boolean;
  interpreter: Interpreter;
}

export function assertResult(result: Result) {
  const message = result.expectedError
    ? `${result.src}: Actual "${result.actualError.message}", Expected "${result.expectedError.message}"`
    : `${result.src}: Actual ${JSON.stringify(result.actual)}, Expected ${JSON.stringify(result.expected)}`;
  expect(result.success).to.equal(true, message);
}

export function assertError(src: string, error: string) {
  debug(`assertError(\`${src}\`)`);
  const interpreter = new Interpreter();

  let expected = 'No error',
    actual = 'No error';
  try {
    evaluate(src);
  } catch (e) {
    expected = e.message;
  }
  try {
    interpreter.run(parseScript(src));
  } catch (e) {
    actual = e.message;
  }

  if (actual) debug(`Interpreter error: ${actual}`);
  if (expected) debug(`Native error: ${expected}`);

  expect(actual).to.equal(expected);
}

function funcify(fn: Function) {
  const src = fn.toString();
  return `(${src})()`;
}

export function compare(src: string | Function, context?: BasicContext): Result {
  const interpreter = new Interpreter();
  let nativeExpectedValue, nativeExpectedError;
  debug(`compare(\`${src}\`)`);
  try {
    nativeExpectedValue = evaluate(src, context);
  } catch (e) {
    nativeExpectedError = e;
  }
  let interpreterActualValue, interpreterActualError;
  let finalSrc = typeof src === 'string' ? src : funcify(src);
  try {
    interpreter.load(parseScript(finalSrc), context);
    interpreterActualValue = interpreter.run();
  } catch (e) {
    interpreterActualError = e;
  }
  debug(`== Interpreter result: ${interpreterActualValue}`);
  debug(`== Native result     : ${nativeExpectedValue}`);
  if (interpreterActualError) debug(`!! Interpreter error: ${interpreterActualError.message}`);
  else debug(`!! Interpreter error: <none>`);
  if (nativeExpectedError) debug(`!! Native error     : ${nativeExpectedError.message}`);
  else debug(`!! Native error     : <none>`);
  let success = false;
  if (Number.isNaN(nativeExpectedValue)) {
    success = Number.isNaN(interpreterActualValue);
    debug(`Interpreter produced NaN, Native produced ${interpreterActualValue}`);
  } else if (nativeExpectedError) {
    if (!interpreterActualError) {
      debug(`Failure: Native produced error, Interpreter did not`);
      interpreterActualError = { message: '<<Did not throw an error>>' };
      success = false;
    } else {
      success = interpreterActualError.message === nativeExpectedError.message;
      debug(`Both produced errors (same===${success})`);
    }
  } else {
    if (interpreterActualError) {
      debug(`Failure: Interpreter produced error, Native did not`);
      console.log(interpreterActualError);
      success = false;
    } else {
      success = deepEqual(nativeExpectedValue, interpreterActualValue);
    }
  }

  return {
    actual: interpreterActualValue,
    actualError: interpreterActualError,
    expected: nativeExpectedValue,
    expectedError: nativeExpectedError,
    src: finalSrc,
    success,
    interpreter,
  };
}
