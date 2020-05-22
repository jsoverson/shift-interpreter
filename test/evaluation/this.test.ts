import chai from "chai";
import spies from "chai-spies";
import { assertResult, compare } from "../util";

chai.use(spies);

describe("this", () => {
  it("should refer to local context", async () => {
    const context = { global: {}, console };
    context.global = context;

    assertResult(
      await compare(`
      const c = {
        a : function() {return this.b},
        b : "Hello"
      }
      c.a();
    `)
    );
  });
  it("should support dynamic context", async () => {
    const context = { global: {}, console };
    context.global = context;

    assertResult(
      await compare(`
    const outer = {
      inner: {
        innerFn() {
          return this.b
        },
        b: "innerValue"
      },
      outerFn() {
        this.extracted = this.inner.innerFn;
        return this.extracted();
      },
      b : "outerValue"
    }
    outer.outerFn();
    `)
    );
  });
});
