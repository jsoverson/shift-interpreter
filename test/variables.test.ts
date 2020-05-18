import { assertResult, compare } from "./util";

describe("Variables", () => {
  it("should declare and init variables and be able to retrieve the value", () => {
    assertResult(compare('let a = 2; a;'))
  });
  it("should update values", () => {
    assertResult(compare('let a = 2; a = 3; a;'))
  });
  it("should update values", () => {
    assertResult(compare('let a = 2; a = a + 2; a;'))
  });

  it("decltype-less assignments should assign a global", () => {
    assertResult(compare('function a() { b = 2; } a(); b'))
  });
  
  it("var statements should be hoisted", () => {
    assertResult(compare('function a() { b = 2; var b; } a(); b'))
  });
  
  it.only("should assign to hoisted variables", () => {
    assertResult(compare('function a() { return b; b = 3; var b = 2; } a()'))
    assertResult(compare('function a() { b = 3; return b; var b = 2; } a()'))
    assertResult(compare('function a() { b = 3; var b = 2; return b; } a()'))
  });
  
  it("should support const", () => {
    assertResult(compare('const a = 2; a;'))
  });
  xit("should not allow reassignment to constants", () => {
    // I'm not sure I care about accounting for this. The original JS will break and
    // this project isn't meant to evaluate WIP JS, it's intended to analyze known-good JS.
    // Deferring until necessary.
    assertResult(compare('const a = 2; const a = 3; a;'))
  });
  it("should hoist var statements", () => {
    assertResult(compare('let [a] = [2]; a;'))
  });
  it("should allow array pattern assignments", () => {
    assertResult(compare('let [a] = [2]; a;'))
  });
  it("should allow array pattern assignments with defaults", () => {
    assertResult(compare('let [a = 22] = []; a === 22;'))
  });
  it("should allow object pattern assignments", () => {
    assertResult(compare('let {a} = {a:22}; a;'))
  });
  it("should allow object pattern assignments with defaults", () => {
    assertResult(compare('let {a = 33} = {}; a;'))
  });
  it("should allow object pattern assignments with binding property", () => {
    assertResult(compare('let {a : b} = {a:22}; b;'))
  });
  it("should allow object pattern assignments with computed property names", () => {
    assertResult(compare('let {["a"] : b} = {a:22}; b;'))
  });
  it("should allow nested pattern assignments with computed property names", () => {
    assertResult(compare('let {["a"] : [b]} = {a:[22]}; b === 22;'))
  });
});
