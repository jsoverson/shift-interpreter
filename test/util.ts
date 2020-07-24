import {expect} from 'chai';
import {parseScript} from 'shift-parser';
import {Interpreter} from '../src/interpreter';
import {BasicContext} from '../src/context';

import DEBUG from 'debug';
import {RuntimeValue} from '../src';

const debug = DEBUG('shift:interpreter:test');

const evaluate = require('./nostrict-eval.js').eval;

export interface Result {
  actual: any;
  actualError: Error;
  expected: any;
  expectedError: Error;
  src: string;
  success: boolean;
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

export async function compare(src: string | Function, context?: BasicContext): Promise<Result> {
  const interpreter = new Interpreter();
  if (context) interpreter.pushContext(context);
  let nativeExpectedValue, nativeExpectedError;
  debug(`compare(\`${src}\`)`);
  try {
    nativeExpectedValue = evaluate(src);
  } catch (e) {
    nativeExpectedError = e;
  }
  let interpreterActualValue, interpreterActualError;
  let finalSrc = typeof src === 'string' ? src : funcify(src);
  try {
    interpreter.load(parseScript(finalSrc));
    // const result = await interpreter.stepInteractive();
    const result = await interpreter.run();
    interpreterActualValue = RuntimeValue.unwrap(result);
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
      interpreterActualError = {message: '<<Did not throw an error>>'};
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
      success = nativeExpectedValue === interpreterActualValue;
    }
  }

  return {
    actual: interpreterActualValue,
    actualError: interpreterActualError,
    expected: nativeExpectedValue,
    expectedError: nativeExpectedError,
    src: finalSrc,
    success,
  };
}
