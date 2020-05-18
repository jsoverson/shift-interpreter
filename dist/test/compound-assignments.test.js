"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const operators = [
    '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '^=', '&='
];
// const specialOps = ['in' , 'instanceof'];
describe("CompoundAssignment", () => {
    it("should evaluate operators the same as the host environment", () => {
        const sample = [2, 120, 1981, "2", "hi", NaN, true, false, 1 / 0];
        const results = operators.flatMap(op => sample.flatMap(l => sample.map(r => util_1.compare(`let b = ${JSON.stringify(l)}; b ${op} ${JSON.stringify(r)}`))));
        results.forEach(util_1.assertResult);
    });
    it("should evaluate operators the same as the host environment", () => {
        const sample = [2, 120, 1981, "2", "hi", NaN, true, false, 1 / 0];
        const results = operators.flatMap(op => sample.flatMap(l => sample.map(r => util_1.compare(`let b = {a:${JSON.stringify(l)}}; b.a ${op} ${JSON.stringify(r)}`))));
        results.forEach(util_1.assertResult);
    });
    it("should evaluate operators the same as the host environment", () => {
        const sample = [2, 120, 1981, "2", "hi", NaN, true, false, 1 / 0];
        const results = operators.flatMap(op => sample.flatMap(l => sample.map(r => util_1.compare(`let b = {a:${JSON.stringify(l)}}; b["a"] ${op} ${JSON.stringify(r)}`))));
        results.forEach(util_1.assertResult);
    });
});
//# sourceMappingURL=compound-assignments.test.js.map