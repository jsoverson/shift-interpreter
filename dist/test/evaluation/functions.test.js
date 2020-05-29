"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = __importDefault(require("chai"));
const util_1 = require("../util");
const shift_parser_1 = require("shift-parser");
const src_1 = require("../../src");
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
    it("should support .call()", async () => {
        util_1.assertResult(await util_1.compare(`
    var context = {
      expected: "hello",
    };
    function dyno(prop) {
      return this[prop];
    }
    dyno.call(context, "expected");
    `));
    });
    it("should support prototype modifications", async () => {
        util_1.assertResult(await util_1.compare(`
      function d() {}
      d.prototype.run = function () {return "expected"};
      d.prototype.run();
    `));
    });
    it("should support .apply()", async () => {
        util_1.assertResult(await util_1.compare(`
    var context = {
      expected: "hello",
    };
    function dyno(prop) {
      return this[prop];
    }
    dyno.apply(context, ["expected"]);
    `));
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
    it("should hoist functions", async () => {
        const src = 'a.b = 2; function a(){}';
        const ast = shift_parser_1.parseScript(src);
        const interpreter = new src_1.Interpreter();
        interpreter.load(ast);
        await interpreter.run();
        const fnDecl = ast.statements.find(st => st.type === 'FunctionDeclaration');
        const fn = () => {
            const value = interpreter.getRuntimeValue(fnDecl.name).unwrap();
            chai_1.default.expect(value.b.unwrap()).to.equal(2);
        };
        chai_1.default.expect(fn).to.not.throw();
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
        util_1.assertResult(await util_1.compare("let holder = { set property(argument) {this._secretProp = argument} }; holder.property = 22; false /* dummy expression to catch promise-based setter regression */; holder._secretProp"));
    });
    xit("should register setters properly on host objects", async () => {
        // TODO: fix this
        const tree = shift_parser_1.parseScript(`holder = { set property(argument) {this._secretProp = argument} };`);
        //@ts-ignore
        const objectExpression = tree.statements[0].expression;
        const interpreter = new src_1.Interpreter();
        interpreter.load(tree);
        const obj = src_1.RuntimeValue.unwrap(await interpreter.evaluateNext(objectExpression));
        obj.property = 22;
        chai_1.default.expect(obj._secretProp).to.equal(22);
    });
    it("should define both", async () => {
        util_1.assertResult(await util_1.compare("let a = { set b(c) {this._b = c + 10}, get b(){return this._b} }; a.b = 22; a.b"));
    });
});
//# sourceMappingURL=functions.test.js.map