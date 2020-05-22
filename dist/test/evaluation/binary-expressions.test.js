"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
const operators = [
    "==",
    "!=",
    "===",
    "!==",
    "<",
    "<=",
    ">",
    ">=",
    "<<",
    ">>",
    ">>>",
    "+",
    "-",
    "*",
    "/",
    "%",
    "**",
    ",",
    "&&",
    ",",
    "^",
    "&"
];
// const specialOps = ['in' , 'instanceof'];
describe("BinaryExpressions", () => {
    it("should evaluate operators the same as the host environment", async () => {
        const sample = [2, 120, 1981, "2", "hi", NaN, true, false, 1 / 0];
        const results = await Promise.allSettled(operators.flatMap(op => sample.flatMap(l => sample.map(r => util_1.compare(`${JSON.stringify(l)} ${op} ${JSON.stringify(r)}`)))));
        results.forEach(result => { if (result.status === 'fulfilled')
            util_1.assertResult(result.value); });
    });
});
//# sourceMappingURL=binary-expressions.test.js.map