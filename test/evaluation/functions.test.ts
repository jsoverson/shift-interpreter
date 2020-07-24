import chai from 'chai';
import {assertResult, compare} from '../util';
import {parseScript} from 'shift-parser';
import {Interpreter, interpret} from '../../src';
import {FunctionDeclaration, AssignmentExpression} from 'shift-ast';

describe('Functions', () => {
  it('should declare functions', () => {
    assertResult(compare('function a(){return 2}; a();'));
  });
  it('should hoist functions for purposes of member access/assignment', () => {
    assertResult(compare("a.foo = 'bar'; function a(){}; a.foo;"));
  });

  it('should call methods on primitive literals', () => {
    assertResult(compare("'a'.replace('a','b');"));
  });
  it('should call methods on primitive return values', () => {
    assertResult(compare("fn = () => 'a';fn().replace('a','b');"));
  });
  it('should assign arrow expressions', () => {
    assertResult(compare('let a = (a) => {return a}; a(4)'));
  });
  it('arrow expressions should retain `this` binding', () => {
    assertResult(compare('let a = { a: () => {return this.b}, b: 44 }; const b = a.a; b();'));
  });
  it('should evaluate shorthand arrow expressions', () => {
    assertResult(compare('let a = _ => _ + 10; a(2);'));
  });
  it('should call functions with arguments that have defaults', () => {
    assertResult(compare('function fn(a = 22){return a + 10}; fn() + fn(33);'));
  });
  it('should call functions with arguments', () => {
    assertResult(compare('function a(a,b){return a+b}; a(2,5) === 7;'));
  });
  it('should allow reference to arguments special variable', () => {
    assertResult(compare('function a(b){return arguments[0] + 10}; a(33);'));
  });
  it('should support .call()', () => {
    assertResult(
      compare(`
    var context = {
      expected: "hello",
    };
    function dyno(prop) {
      return this[prop];
    }
    dyno.call(context, "expected");
    `),
    );
  });
  it('should support prototype modifications', () => {
    assertResult(
      compare(`
      function d() {}
      d.prototype.run = function () {return "expected"};
      d.prototype.run();
    `),
    );
  });
  it('should support .apply()', () => {
    assertResult(
      compare(`
    var context = {
      expected: "hello",
    };
    function dyno(prop) {
      return this[prop];
    }
    dyno.apply(context, ["expected"]);
    `),
    );
  });
  it('should access appropriate context', () => {
    assertResult(
      compare(`
    var c = {
      expected: "hello",
      test: function(actual) {
        return actual === c.expected;
      }
    };
    c.test("hello") === true;
    `),
    );
    assertResult(
      compare(`
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
    `),
    );
  });

  it('should hoist functions', () => {
    const src = 'a.b = 2; function a(){}';
    const ast = parseScript(src);
    const interpreter = new Interpreter();
    interpreter.load(ast);
    interpreter.run();
    const fnDecl = ast.statements.find(st => st.type === 'FunctionDeclaration') as FunctionDeclaration;

    const fn = () => {
      const value = interpreter.getRuntimeValue(fnDecl.name);
      chai.expect(value.b).to.equal(2);
    };
    chai.expect(fn).to.not.throw();
  });

  it('should store and execute function expressions', () => {
    assertResult(compare('let a = function(){return 2}; a();'));
  });
  it('should return from sub statements', () => {
    assertResult(compare("function a() { if (true) return 'in branch'; return 'should not get here'}; a();"));
  });
  it('should return from sub blocks', () => {
    assertResult(
      compare(`
    function _isSameValue(a, b) {
      if (a === b) {
        return true;
      }
      return false;
    };    
    _isSameValue("1","1");
    `),
    );
  });
});

describe('Getters/Setters', () => {
  it('should define getters', () => {
    assertResult(compare('let a = { get b() {return 2} }; a.b;'));
  });
  it('should define setters', () => {
    assertResult(
      compare(
        'let holder = { set property(argument) {this._secretProp = argument} }; holder.property = 22; false /* dummy expression to catch promise-based setter regression */; holder._secretProp',
      ),
    );
  });
  it('should register setters properly on host objects', () => {
    const tree = parseScript(`holder = { set property(argument) {this._secretProp = argument} };`);
    //@ts-ignore
    const objectExpression = tree.statements[0].expression as AssignmentExpression;
    const interpreter = new Interpreter();
    interpreter.load(tree);
    const obj = interpreter.evaluateNext(objectExpression);
    obj.property = 22;
    chai.expect(obj._secretProp).to.equal(22);
  });
  it('should define both', () => {
    const src = `
      let a = {
        _b: 0,
        set b(c) {
          this._b = c + 10;
        },
        get b() {
          return this._b;
        },
      };
      a.b = 22;
      a.b;
    `;
    assertResult(compare(src));
  });
});
