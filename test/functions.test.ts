import { assertResult, compare } from "./util";

describe("Functions", () => {
  it("should declare functions", () => {
    assertResult(compare('function a(){return 2}; a();'))
  });
  it("should call functions with arguments", () => {
    assertResult(compare('function a(a,b){return a+b}; a(2,5) === 7;'))
    assertResult(compare(`
    var c = {
      expected: "arsoten",
      test: function(actual) {
        return actual === c.expected;
      }
    };
    c.test("arsoten");
    `))
  });
  it("should store and execute function expressions", () => {
    assertResult(compare('let a = function(){return 2}; a();'))
  });
});


