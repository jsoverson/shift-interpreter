"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
const operators = [
    '+', '-', '!', '~', 'typeof', 'void' //, 'delete'
];
// const specialOps = ['in' , 'instanceof'];
describe("UnaryExpressions", () => {
    it("should evaluate operators the same as the host environment", async () => {
        const operands = [2, 120, 1981, "2", "hi", NaN, true, false, {}, 1 / 0];
        const results = await Promise.allSettled(operators.flatMap(op => operands.map(oper => util_1.compare(`${op} ${JSON.stringify(oper)}`))));
        results.forEach(result => { if (result.status === 'fulfilled')
            util_1.assertResult(result.value); });
    });
    it("should evaluate typeof on an undeclared variable", async () => {
        util_1.assertResult(await util_1.compare(`typeof foo`));
    });
});
//# sourceMappingURL=unary-expressions.test.js.map