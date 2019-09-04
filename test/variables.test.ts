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
  
  it("should support const", () => {
    assertResult(compare('const a = 2; a;'))
  });
  it("should not allow reassignment to constants", () => {
    // Deferring runtime checks like this until necessary.
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
