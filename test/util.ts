import { expect } from "chai";
import { parseScript } from "shift-parser";
import { Interpreter } from "../src/interpreter";
import { InterpreterContext } from "../src/context";

export interface Result {
  actual: any;
  actualError: Error;
  expected: any;
  expectedError: Error;
  src: string;
  success: boolean;
}

export function assertResult(result: Result) {
  const message = result.expectedError ? 
    `${result.src}: Actual ${result.actualError.message}, Expected ${result.expectedError.message}` :
    `${result.src}: Actual ${JSON.stringify(
      result.actual
    )}, Expected ${JSON.stringify(result.expected)}`
  expect(result.success).to.equal(true,message);
}

export function assertError(src: string, error: string) {
  const interpreter = new Interpreter();

  let expected = "No error",
    actual = "No error";
  try {
    eval(src);
  } catch (e) {
    expected = e.message;
  }
  try {
    interpreter.evaluate(parseScript(src));
  } catch (e) {
    actual = e.message;
  }

  expect(actual).to.equal(expected);
}

export function compare(src: string, context?: InterpreterContext): Result {
  const interpreter = new Interpreter(context);
  let expected, expectedError;
  try {
    expected = eval(src);
  } catch (e) {
    expectedError = e;
  }
  let actual, actualError;
  try {
    actual = interpreter.evaluate(parseScript(src));
  } catch (e) {
    actualError = e;
  }
  let success = false;
  if (Number.isNaN(expected)) {
    success = Number.isNaN(actual);
  } else if (expectedError) {
    success = actualError.message === expectedError.message;
  } else {
    if (actualError) console.log(actualError)
    success = expected === actual;
  }

  return {
    actual,
    actualError,
    expected,
    expectedError,
    src,
    success
  };
}
