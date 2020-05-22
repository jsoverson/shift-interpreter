import { assertResult, compare } from "../util";

describe("Errors", () => {
  it("should throw", async () => {
    assertResult(await compare("throw new Error('hello world')",{Error}));
  });
});
