import { Interpreter } from "../src/interpreter";

import { expect } from "chai";
import {
  Expression,
  LiteralStringExpression,
  LiteralNumericExpression,
  LiteralBooleanExpression,
  LiteralInfinityExpression,
  LiteralNullExpression,
  LiteralRegExpExpression
} from "shift-ast";
// import 'mocha';

function evaluate(expr: Expression) {
  const interpreter = new Interpreter();
  return interpreter.evaluateExpression(expr);
}

describe("Literals", () => {
  it("should evaluate LiteralStringExpression", () => {
    expect(evaluate(new LiteralStringExpression({ value: "Hello" }))).to.equal(
      "Hello"
    );
  });
  it("should evaluate LiteralNumericExpression", () => {
    expect(evaluate(new LiteralNumericExpression({ value: 20 }))).to.equal(20);
  });
  it("should evaluate LiteralBooleanExpression", () => {
    expect(evaluate(new LiteralBooleanExpression({ value: true }))).to.equal(
      true
    );
    expect(evaluate(new LiteralBooleanExpression({ value: false }))).to.equal(
      false
    );
  });
  it("should evaluate LiteralInfinityExpression", () => {
    expect(evaluate(new LiteralInfinityExpression())).to.equal(1 / 0);
  });
  it("should evaluate LiteralNullExpression", () => {
    expect(evaluate(new LiteralNullExpression())).to.equal(null);
    expect(evaluate(new LiteralNullExpression())).to.not.equal(undefined);
    expect(evaluate(new LiteralNullExpression())).to.not.equal(false);
  });
  xit("should evaluate LiteralRegExpExpression", () => {
    expect(
      evaluate(
        new LiteralRegExpExpression({
          pattern: "ab",
          global: true,
          ignoreCase: false,
          multiLine: false,
          dotAll: false,
          sticky: false,
          unicode: false
        })
      )
    ).to.equal(null);
  });
});
