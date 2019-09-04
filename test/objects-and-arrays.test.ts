import { assertResult, compare } from "./util";

describe("Objects", () => {
  it("should evaluate object expressions and allow static member access", () => {
    assertResult(compare("let a = {b:2}; a.b;"));
  });
  it("should evaluate object expressions and allow computed member access", () => {
    assertResult(compare('let a = {b:2}; a["b"];'));
  });
  it("should evaluate complex objects", () => {
    assertResult(compare('let a = {b:2,c:{ca:"hello"}}; a.c.ca;'));
  });
  it("should evaluate methods on objects", () => {
    assertResult(compare('let a = {b(a){return a}}; a.b(2);'));
  });
  it("should allow for object member assignment", () => {
    assertResult(compare('let a = {}; a.b = 2;'));
    assertResult(compare('let a = {}; a["b"] = 2;'));
  });
});
describe('Arrays', () => {
  it("should parse array expressions", () => {
    assertResult(compare('let a = [1,2,3,4]; a[3];'));
  });
  it("should parse array expressions with spread", () => {
    assertResult(compare('let a = [1,2,3,4], b = [...a];'));
  });
});
