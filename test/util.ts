import { expect } from "chai";
import { parseScript } from "shift-parser";
import { Interpreter } from "../src/interpreter";
import { InterpreterContext } from "../src/context";

export interface Result {
  actual: any;
  expected: any;
  src: string;
  success: boolean;
}

export function assertResult(result: Result) {
  expect(result.success).to.equal(
    true,
    `${result.src}: Actual ${JSON.stringify(
      result.actual
    )}, Expected ${JSON.stringify(result.expected)}`
  );
}

export function assertError(src: string, error: string) {
  const interpreter = new Interpreter();

  let expected = "aaa",
    actual = "bbb";
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
  let expected;
  try {
    expected = eval(src);
  } catch (e) {
    console.error(src);
    throw e;
  }
  const actual = interpreter.evaluate(parseScript(src));
  const success = Number.isNaN(expected)
    ? Number.isNaN(actual)
    : expected === actual;
  return {
    actual,
    expected,
    src,
    success
  };
}
