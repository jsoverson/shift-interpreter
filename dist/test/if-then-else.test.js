"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
describe("If Then Else", () => {
    it("should evaluate if statements", () => {
        util_1.assertResult(util_1.compare('let a = 2; if (a > 1) { a = 5 } a;'));
    });
    it("should evaluate if else statements", () => {
        util_1.assertResult(util_1.compare('let a = 2; if (a > 100) { a = 5 } else a = 2; a;'));
    });
    it("should evaluate if else if statements", () => {
        util_1.assertResult(util_1.compare('let a = 2; if (a > 100) a = 5; else if (true) a = "foo"; a;'));
    });
});
//# sourceMappingURL=if-then-else.test.js.map