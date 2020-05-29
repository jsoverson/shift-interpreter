"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const shift_ast_1 = require("shift-ast");
const interpreter_1 = require("../../src/interpreter");
const util_1 = require("../util");
async function evaluate(expr) {
    const interpreter = new interpreter_1.Interpreter();
    return interpreter.evaluateExpression(expr);
}
describe("Literals", () => {
    it("should evaluate LiteralStringExpression", async () => {
        util_1.assertResult(await util_1.compare('1/* prevent directive */;"hello"'));
    });
    it("should evaluate LiteralNumericExpression", async () => {
        util_1.assertResult(await util_1.compare('20'));
    });
    it("should evaluate LiteralBooleanExpression", async () => {
        util_1.assertResult(await util_1.compare('true'));
        util_1.assertResult(await util_1.compare('false'));
    });
    it("should evaluate LiteralInfinityExpression", async () => {
        chai_1.expect(await evaluate(new shift_ast_1.LiteralInfinityExpression())).to.equal(1 / 0);
    });
    it("should evaluate LiteralNullExpression", async () => {
        util_1.assertResult(await util_1.compare('null'));
    });
    describe('TemplateStrings', () => {
        it("should evaluate basic templates", async () => {
            util_1.assertResult(await util_1.compare('`hello world`'));
        });
        it("should evaluate template strings with embedded expressions", async () => {
            util_1.assertResult(await util_1.compare('`hello ${"world"}`'));
        });
        xit("should evaluate tagged template strings", async () => {
            // should it though? Deferring support until I run across them in a script I care about.
        });
    });
    it("should evaluate LiteralRegExpExpression", async () => {
        util_1.assertResult(await util_1.compare(`"abcd".match(/abcd/)[0] === 'abcd';`));
    });
});
//# sourceMappingURL=literal-expressions.test.js.map