"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
describe("Functions", () => {
    it("should declare functions", async () => {
        util_1.assertResult(await util_1.compare("function a(){return 2}; a();"));
    });
    it("should hoist functions", async () => {
        util_1.assertResult(await util_1.compare("a.foo = 'bar'; function a(){}; a.foo;"));
    });
    it("should assign arrow expressions", async () => {
        util_1.assertResult(await util_1.compare("let a = (a) => {return a}; a(4)"));
    });
    it("arrow expressions should retain `this` binding", async () => {
        util_1.assertResult(await util_1.compare("let a = { a: () => {return this.b}, b: 44 }; const b = a.a; a.a() + b();"));
    });
    it("should evaluate shorthand arrow expressions", async () => {
        util_1.assertResult(await util_1.compare("let a = _ => _ + 10; a(2);"));
    });
    it("should call functions with arguments that have defaults", async () => {
        util_1.assertResult(await util_1.compare("function fn(a = 22){return a + 10}; fn() + fn(33);"));
    });
    it("should call functions with arguments", async () => {
        util_1.assertResult(await util_1.compare("function a(a,b){return a+b}; a(2,5) === 7;"));
    });
    it("should allow reference to arguments special variable", async () => {
        util_1.assertResult(await util_1.compare("function a(b){return arguments[0] + 10}; a(33);"));
    });
    it("should access appropriate context", async () => {
        util_1.assertResult(await util_1.compare(`
    var c = {
      expected: "hello",
      test: function(actual) {
        return actual === c.expected;
      }
    };
    c.test("hello") === true;
    `));
        util_1.assertResult(await util_1.compare(`
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
    it("should store and execute function expressions", async () => {
        util_1.assertResult(await util_1.compare("let a = function(){return 2}; a();"));
    });
    it("should return from sub statements", async () => {
        util_1.assertResult(await util_1.compare("function a() { if (true) return 'in branch'; return 'should not get here'}; a();"));
    });
    it("should return from sub blocks", async () => {
        util_1.assertResult(await util_1.compare(`

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
    it("should define getters", async () => {
        util_1.assertResult(await util_1.compare("let a = { get b() {return 2} }; a.b;"));
    });
    it("should define setters", async () => {
        util_1.assertResult(await util_1.compare("let holder = { set property(argument) {this._secretProp = argument} }; holder.property = 22; holder._secretProp"));
    });
    it.only("should define both", async () => {
        util_1.assertResult(await util_1.compare("let a = { set b(c) {this._b = c + 10}, get b(){return this._b} }; a.b = 22; a.b"));
    });
});
//# sourceMappingURL=functions.test.js.map