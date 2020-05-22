"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
describe("Errors", () => {
    it("should throw", async () => {
        util_1.assertResult(await util_1.compare("throw new Error('hello world')", { Error }));
    });
});
//# sourceMappingURL=errors.test.js.map