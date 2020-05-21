"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
describe("Objects", () => {
    it("should evaluate object expressions and allow static member access", () => {
        util_1.assertResult(util_1.compare("let a = {b:2}; a.b;"));
    });
    it("should evaluate object expressions and allow computed member access", () => {
        util_1.assertResult(util_1.compare('let a = {b:2}; a["b"];'));
    });
    it("should evaluate complex objects", () => {
        util_1.assertResult(util_1.compare('let a = {b:2,c:{ca:"hello"}}; a.c.ca;'));
    });
    it("should evaluate methods on objects", () => {
        util_1.assertResult(util_1.compare('let a = {b(a){return a}}; a.b(2);'));
    });
    it("should evaluate shorthand props", () => {
        util_1.assertResult(util_1.compare('let b = 2; let a = {b}; a.b;'));
    });
    // ES2018, not implemented in shift parser yet
    xit("should evaluate objects with rest/spread element", () => {
        util_1.assertResult(util_1.compare('let b = {a:1,b:2,c:3}; let a = {...b}; a.a+a.b+a.c === b.a+b.b+b.c;'));
    });
    it("should allow for object member assignment", () => {
        util_1.assertResult(util_1.compare('let a = {}; a.b = 2;'));
        util_1.assertResult(util_1.compare('let a = {}; a["b"] = 2;'));
    });
});
describe('Arrays', () => {
    it("should parse array expressions", () => {
        util_1.assertResult(util_1.compare('let a = [1,2,3,4]; a[3];'));
    });
    it("should parse array expressions with spread", () => {
        util_1.assertResult(util_1.compare('let a = [1,2,3,4], b = [...a];'));
    });
});
//# sourceMappingURL=objects-and-arrays.test.js.map