import { assertResult, compare } from "../util";

describe("If Then Else", () => {
  it("should evaluate if statements", () => {
    assertResult(compare('let a = 2; if (a > 1) { a = 5 } a;'))
  });
  it("should evaluate if else statements", () => {
    assertResult(compare('let a = 2; if (a > 100) { a = 5 } else a = 2; a;'))
  });
  it("should evaluate if else if statements", () => {
    assertResult(compare('let a = 2; if (a > 100) a = 5; else if (true) a = "foo"; a;'))
  });
});
