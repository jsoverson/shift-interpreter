"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
describe("Objects", () => {
    it("should not interferes with promises", async () => {
        //@ts-ignore
        const outer = global.outer = new Promise((res) => { res(22); });
        util_1.assertResult(await util_1.compare("let inner = this.outer; inner", { outer }));
    });
    it("should evaluate object expressions and allow static member access", async () => {
        util_1.assertResult(await util_1.compare("let a = {b:2}; a.b;"));
    });
    it("should evaluate object expressions and allow computed member access", async () => {
        util_1.assertResult(await util_1.compare('let a = {b:2}; a["b"];'));
    });
    it("should evaluate complex objects", async () => {
        util_1.assertResult(await util_1.compare('let a = {b:2,c:{ca:"hello"}}; a.c.ca;'));
    });
    it("should evaluate methods on objects", async () => {
        util_1.assertResult(await util_1.compare('let a = {b(a){return a}}; a.b(2);'));
    });
    it("should evaluate shorthand props", async () => {
        util_1.assertResult(await util_1.compare('let b = 2; let a = {b}; a.b;'));
    });
    // ES2018, not implemented in shift parser yet
    xit("should evaluate objects with rest/spread element", async () => {
        util_1.assertResult(await util_1.compare('let b = {a:1,b:2,c:3}; let a = {...b}; a.a+a.b+a.c === b.a+b.b+b.c;'));
    });
    it("should allow for object member assignment", async () => {
        util_1.assertResult(await util_1.compare('let a = {}; a.b = 2;'));
        util_1.assertResult(await util_1.compare('let a = {}; a["b"] = 2;'));
    });
});
describe('Arrays', () => {
    it("should parse array expressions", async () => {
        util_1.assertResult(await util_1.compare('let a = [1,2,3,4]; a[3];'));
    });
    it("should parse array expressions with spread", async () => {
        util_1.assertResult(await util_1.compare('let a = [1,2,3,4], b = [...a];'));
    });
});
//# sourceMappingURL=objects-and-arrays.test.js.map