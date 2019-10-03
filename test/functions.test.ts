import { assertResult, compare } from "./util";

describe("Functions", () => {
  it("should declare functions", () => {
    assertResult(compare("function a(){return 2}; a();"));
  });
  it("should assign arrow expressions", () => {
    assertResult(compare("let a = (a) => {return a}; a(4)"));
  });
  it("arrow expressions should retain `this` binding", () => {
    assertResult(compare("let a = { a: () => {return this.b}, b: 44 }; const b = a.a; a.a() + b();"));
  });
  it("should evaluate shorthand arrow expressions", () => {
    assertResult(compare("let a = _ => _ + 10; a(2);"));
  });
  it("should call functions with arguments that have defaults", () => {
    assertResult(compare("function a(a = 22){return a + 10}; a() + a(33);"));
  });
  it("should call functions with arguments", () => {
    assertResult(compare("function a(a,b){return a+b}; a(2,5) === 7;"));
    assertResult(
      compare(`
    var c = {
      expected: "hello",
      test: function(actual) {
        return actual === c.expected;
      }
    };
    c.test("hello");
    `)
    );
  });
  it("should store and execute function expressions", () => {
    assertResult(compare("let a = function(){return 2}; a();"));
  });
});
