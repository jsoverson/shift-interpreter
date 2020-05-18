"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
describe("Variables", () => {
    it("should declare and init variables and be able to retrieve the value", () => {
        util_1.assertResult(util_1.compare('let a = 2; a;'));
    });
    it("should update values", () => {
        util_1.assertResult(util_1.compare('let a = 2; a = 3; a;'));
    });
    it("should update values", () => {
        util_1.assertResult(util_1.compare('let a = 2; a = a + 2; a;'));
    });
    it.only("decltype-less assignments should assign a global", () => {
        util_1.assertResult(util_1.compare('function a() { b = 2; } a(); b'));
    });
    it("should support const", () => {
        util_1.assertResult(util_1.compare('const a = 2; a;'));
    });
    xit("should not allow reassignment to constants", () => {
        // I'm not sure I care about accounting for this. The original JS will break and
        // this project isn't meant to evaluate WIP JS, it's intended to analyze known-good JS.
        // Deferring until necessary.
        util_1.assertResult(util_1.compare('const a = 2; const a = 3; a;'));
    });
    it("should hoist var statements", () => {
        util_1.assertResult(util_1.compare('let [a] = [2]; a;'));
    });
    it("should allow array pattern assignments", () => {
        util_1.assertResult(util_1.compare('let [a] = [2]; a;'));
    });
    it("should allow array pattern assignments with defaults", () => {
        util_1.assertResult(util_1.compare('let [a = 22] = []; a === 22;'));
    });
    it("should allow object pattern assignments", () => {
        util_1.assertResult(util_1.compare('let {a} = {a:22}; a;'));
    });
    it("should allow object pattern assignments with defaults", () => {
        util_1.assertResult(util_1.compare('let {a = 33} = {}; a;'));
    });
    it("should allow object pattern assignments with binding property", () => {
        util_1.assertResult(util_1.compare('let {a : b} = {a:22}; b;'));
    });
    it("should allow object pattern assignments with computed property names", () => {
        util_1.assertResult(util_1.compare('let {["a"] : b} = {a:22}; b;'));
    });
    it("should allow nested pattern assignments with computed property names", () => {
        util_1.assertResult(util_1.compare('let {["a"] : [b]} = {a:[22]}; b === 22;'));
    });
});
//# sourceMappingURL=variables.test.js.map