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
});
