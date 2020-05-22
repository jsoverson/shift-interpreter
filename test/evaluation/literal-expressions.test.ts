import { expect } from "chai";
import { Expression, LiteralInfinityExpression } from "shift-ast";
import { Interpreter } from "../../src/interpreter";
import { assertResult, compare } from "../util";


async function evaluate(expr: Expression) {
  const interpreter = new Interpreter();
  return interpreter.evaluateExpression(expr);
}

describe("Literals", () => {
  it("should evaluate LiteralStringExpression", async () => {
    assertResult(await compare('1/* prevent directive */;"hello"'));
  });
  it("should evaluate LiteralNumericExpression", async () => {
    assertResult(await compare('20'));
  });
  it("should evaluate LiteralBooleanExpression", async () => {
    assertResult(await compare('true'));
    assertResult(await compare('false'));
  });
  it("should evaluate LiteralInfinityExpression", async () => {
    expect(await evaluate(new LiteralInfinityExpression())).to.equal(1 / 0);
  });
  it("should evaluate LiteralNullExpression", async () => {
    assertResult(await compare('null'));
  });
  describe('TemplateStrings', () => {
    it("should evaluate basic templates", async () => {
      assertResult(await compare('`hello world`'));
    });  
    it("should evaluate template strings with embedded expressions", async () => {
      assertResult(await compare('`hello ${"world"}`'));
    });  
    xit("should evaluate tagged template strings", async () => {
      // should it though? These are rarely seen. Deferring support until necessary.
    });  
  })
  it("should evaluate LiteralRegExpExpression", async () => {
    assertResult(await compare(`"abcd".match(/abcd/)[0] === 'abcd';`))
  });
});
