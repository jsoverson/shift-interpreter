import { assertResult, compare } from "./util";

describe("conditional expressions", () => {
  it("should evaluate basic conditional expressions", () => {
    assertResult(compare('true ? "a" : "b"'))
  });
});
