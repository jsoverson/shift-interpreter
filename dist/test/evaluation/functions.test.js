"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
describe("Functions", () => {
    it("should declare functions", () => {
        util_1.assertResult(util_1.compare("function a(){return 2}; a();"));
    });
    it("should hoist functions", () => {
        util_1.assertResult(util_1.compare("a.foo = 'bar'; function a(){}; a.foo;"));
    });
    it("should assign arrow expressions", () => {
        util_1.assertResult(util_1.compare("let a = (a) => {return a}; a(4)"));
    });
    it("arrow expressions should retain `this` binding", () => {
        util_1.assertResult(util_1.compare("let a = { a: () => {return this.b}, b: 44 }; const b = a.a; a.a() + b();"));
    });
    it("should evaluate shorthand arrow expressions", () => {
        util_1.assertResult(util_1.compare("let a = _ => _ + 10; a(2);"));
    });
    it("should call functions with arguments that have defaults", () => {
        util_1.assertResult(util_1.compare("function a(a = 22){return a + 10}; a() + a(33);"));
    });
    it("should call functions with arguments", () => {
        util_1.assertResult(util_1.compare("function a(a,b){return a+b}; a(2,5) === 7;"));
    });
    it("should allow reference to arguments special variable", () => {
        util_1.assertResult(util_1.compare("function a(b){return arguments[0] + 10}; a(33);"));
    });
    it("should access appropriate context", () => {
        util_1.assertResult(util_1.compare(`
    var c = {
      expected: "hello",
      test: function(actual) {
        return actual === c.expected;
      }
    };
    c.test("hello") === true;
    `));
        util_1.assertResult(util_1.compare(`
    var c = {
      expected: "hello",
      test: function(actual) {
        return actual === c.expected;
      }
    };
    var b = {
      expected: "on b"
    };
    b.test = c.test;
    b.test('on b') === true;
    `));
    });
    it("should store and execute function expressions", () => {
        util_1.assertResult(util_1.compare("let a = function(){return 2}; a();"));
    });
    it("should return from sub statements", () => {
        util_1.assertResult(util_1.compare("function a() { if (true) return 'in branch'; return 'should not get here'}; a();"));
    });
    it("should return from sub blocks", () => {
        util_1.assertResult(util_1.compare(`

    function _isSameValue(a, b) {
      if (a === b) {
        // Handle +/-0 vs. -/+0
        return a !== 0 || 1 / a === 1 / b;
      }
    
      // Handle NaN vs. NaN
      return a !== a && b !== b;
    };    

    _isSameValue("1","1");
    `));
    });
});
describe("Getters/Setters", () => {
    it("should define getters", () => {
        util_1.assertResult(util_1.compare("let a = { get b() {return 2} }; a.b;"));
    });
    it("should define setters", () => {
        util_1.assertResult(util_1.compare("let a = { set b(c) {this._b = c} }; a.b = 22; a._b"));
    });
    it("should define both", () => {
        util_1.assertResult(util_1.compare("let a = { set b(c) {this._b = c + 10}, get b(){return this._b} }; a.b = 22; a.b"));
    });
});
//# sourceMappingURL=functions.test.js.map