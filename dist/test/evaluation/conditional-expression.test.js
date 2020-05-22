"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
describe("conditional expressions", () => {
    it("should evaluate basic conditional expressions", async () => {
        util_1.assertResult(await util_1.compare('true ? "a" : "b"'));
    });
});
//# sourceMappingURL=conditional-expression.test.js.map