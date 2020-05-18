"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = __importDefault(require("chai"));
const chai_spies_1 = __importDefault(require("chai-spies"));
const util_1 = require("./util");
chai_1.default.use(chai_spies_1.default);
describe("this", () => {
    it("should refer to local context", () => {
        const context = { global: {}, console };
        context.global = context;
        util_1.assertResult(util_1.compare(`
      const c = {
        a : function() {return this.b},
        b : "Hello"
      }
      c.a();
    `));
    });
    it("should support dynamic context", () => {
        const context = { global: {}, console };
        context.global = context;
        util_1.assertResult(util_1.compare(`
    const outer = {
      inner: {
        innerFn() {
          return this.b
        },
        b: "innerValue"
      },
      outerFn() {
        this.extracted = this.inner.innerFn;
        return this.extracted();
      },
      b : "outerValue"
    }
    outer.outerFn();
    `));
    });
});
//# sourceMappingURL=this.test.js.map