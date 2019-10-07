import { assertResult, compare } from "./util";

describe("Errors", () => {
  it("should throw", () => {
    assertResult(compare("throw new Error('hello world')",{Error}));
  });
});
