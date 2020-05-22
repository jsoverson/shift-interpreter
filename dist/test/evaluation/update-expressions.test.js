"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
describe("UpdateExpression", () => {
    it("should evaluate operators the same as the host environment", async () => {
        util_1.assertResult(await util_1.compare(`let a = 0; let b = a++; b`));
        util_1.assertResult(await util_1.compare(`let a = 0; let b = ++a; b`));
        util_1.assertResult(await util_1.compare(`let a = 0; let b = a--; b`));
        util_1.assertResult(await util_1.compare(`let a = 0; let b = --a; b`));
    });
});
//# sourceMappingURL=update-expressions.test.js.map