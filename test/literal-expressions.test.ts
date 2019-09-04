import { expect } from "chai";
import { Expression, LiteralInfinityExpression } from "shift-ast";
import { Interpreter } from "../src/interpreter";
import { assertResult, compare } from "./util";


function evaluate(expr: Expression) {
  const interpreter = new Interpreter();
  return interpreter.evaluateExpression(expr);
}

describe("Literals", () => {
  it("should evaluate LiteralStringExpression", () => {
    assertResult(compare('1/* prevent directive */;"hello"'));
  });
  it("should evaluate LiteralNumericExpression", () => {
    assertResult(compare('20'));
  });
  it("should evaluate LiteralBooleanExpression", () => {
    assertResult(compare('true'));
    assertResult(compare('false'));
  });
  it("should evaluate LiteralInfinityExpression", () => {
    expect(evaluate(new LiteralInfinityExpression())).to.equal(1 / 0);
  });
  it("should evaluate LiteralNullExpression", () => {
    assertResult(compare('null'));
  });
  describe('TemplateStrings', () => {
    it("should evaluate basic templates", () => {
      assertResult(compare('`hello world`'));
    });  
    it("should evaluate template strings with embedded expressions", () => {
      assertResult(compare('`hello ${"world"}`'));
    });  
    xit("should evaluate tagged template strings", () => {
      // should it though? These are rarely seen. Deferring support until necessary.
    });  
  })
  it("should evaluate LiteralRegExpExpression", () => {
    assertResult(compare(`"abcd".match(/abcd/)[0] === 'abcd';`))
  });
});
