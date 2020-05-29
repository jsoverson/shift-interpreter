"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
describe("Variables", () => {
    it("should declare and init variables and be able to retrieve the value", async () => {
        util_1.assertResult(await util_1.compare('let a = 2; a;'));
    });
    it("should update values", async () => {
        util_1.assertResult(await util_1.compare('let a = 2; a = 3; a;'));
    });
    it("should update and retrieve in one statement", async () => {
        util_1.assertResult(await util_1.compare('let a = 2; a = a + 2; a;'));
    });
    it("decltype-less assignments should assign a global", async () => {
        const context = {};
        util_1.assertResult(await util_1.compare('function a() { b = 2; } a(); b', context));
        // @ts-ignore
        delete global.b;
    });
    it("var statements should be hoisted", async () => {
        util_1.assertResult(await util_1.compare('function a() { b = 2; var b; } a(); b'));
    });
    it("should assign to hoisted variables", async () => {
        util_1.assertResult(await util_1.compare('function a() { return b; b = 3; var b = 2; } a()'));
        util_1.assertResult(await util_1.compare('function a() { b = 3; return b; var b = 2; } a()'));
        util_1.assertResult(await util_1.compare('function a() { b = 3; var b = 2; return b; } a()'));
    });
    it("should support const", async () => {
        util_1.assertResult(await util_1.compare('const a = 2; a;'));
    });
    xit("should not allow reassignment to constants", async () => {
        // I'm not sure I care about for this until I find a real world example.
        util_1.assertResult(await util_1.compare('const a = 3; try { a = 4 } catch {} return a; '));
    });
    it("should allow array pattern assignments", async () => {
        util_1.assertResult(await util_1.compare('let [a] = [2]; a;'));
    });
    it("should allow array pattern assignments with defaults", async () => {
        util_1.assertResult(await util_1.compare('let [a = 22] = []; a === 22;'));
    });
    it("should allow object pattern assignments", async () => {
        util_1.assertResult(await util_1.compare('let {a} = {a:22}; a;'));
    });
    it("should allow object pattern assignments with defaults", async () => {
        util_1.assertResult(await util_1.compare('let {a = 33} = {}; a;'));
    });
    it("should allow object pattern assignments with binding property", async () => {
        util_1.assertResult(await util_1.compare('let {a : b} = {a:22}; b;'));
    });
    it("should allow object pattern assignments with computed property names", async () => {
        util_1.assertResult(await util_1.compare('let {["a"] : b} = {a:22}; b;'));
    });
    it("should allow nested pattern assignments with computed property names", async () => {
        util_1.assertResult(await util_1.compare('let {["a"] : [b]} = {a:[22]}; b === 22;'));
    });
});
//# sourceMappingURL=variables.test.js.map