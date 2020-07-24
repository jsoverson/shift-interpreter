import chai from 'chai';
import {assertResult, compare} from '../util';
import {parseScript} from 'shift-parser';
import {Interpreter, interpret, RuntimeValue} from '../../src';
import {FunctionDeclaration, AssignmentExpression} from 'shift-ast';

describe('Functions', () => {
  it('should declare functions', async () => {
    assertResult(await compare('function a(){return 2}; a();'));
  });
  it('should hoist functions for purposes of member access/assignment', async () => {
    assertResult(await compare("a.foo = 'bar'; function a(){}; a.foo;"));
  });

  it('should call methods on primitive literals', async () => {
    assertResult(await compare("'a'.replace('a','b');"));
  });
  it('should call methods on primitive return values', async () => {
    assertResult(await compare("fn = () => 'a';fn().replace('a','b');"));
  });
  it('should assign arrow expressions', async () => {
    assertResult(await compare('let a = (a) => {return a}; a(4)'));
  });
  it('arrow expressions should retain `this` binding', async () => {
    assertResult(await compare('let a = { a: () => {return this.b}, b: 44 }; const b = a.a; b();'));
  });
  it('should evaluate shorthand arrow expressions', async () => {
    assertResult(await compare('let a = _ => _ + 10; a(2);'));
  });
  it('should call functions with arguments that have defaults', async () => {
    assertResult(await compare('function fn(a = 22){return a + 10}; fn() + fn(33);'));
  });
  it('should call functions with arguments', async () => {
    assertResult(await compare('function a(a,b){return a+b}; a(2,5) === 7;'));
  });
  it('should allow reference to arguments special variable', async () => {
    assertResult(await compare('function a(b){return arguments[0] + 10}; a(33);'));
  });
  it('should support .call()', async () => {
    assertResult(
      await compare(`
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
  it('should support prototype modifications', async () => {
    assertResult(
      await compare(`
      function d() {}
      d.prototype.run = function () {return "expected"};
      d.prototype.run();
    `),
    );
  });
  it('should support .apply()', async () => {
    assertResult(
      await compare(`
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
  it('should access appropriate context', async () => {
    assertResult(
      await compare(`
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
      await compare(`
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

  it('should hoist functions', async () => {
    const src = 'a.b = 2; function a(){}';
    const ast = parseScript(src);
    const interpreter = new Interpreter();
    interpreter.load(ast);
    await interpreter.run();
    const fnDecl = ast.statements.find(st => st.type === 'FunctionDeclaration') as FunctionDeclaration;

    const fn = () => {
      const value = interpreter.getRuntimeValue(fnDecl.name).unwrap();
      chai.expect(value.b.unwrap()).to.equal(2);
    };
    chai.expect(fn).to.not.throw();
  });

  it('should store and execute function expressions', async () => {
    assertResult(await compare('let a = function(){return 2}; a();'));
  });
  it('should return from sub statements', async () => {
    assertResult(await compare("function a() { if (true) return 'in branch'; return 'should not get here'}; a();"));
  });
  it('should return from sub blocks', async () => {
    assertResult(
      await compare(`

    function _isSameValue(a, b) {
      if (a === b) {
        // Handle +/-0 vs. -/+0
        return a !== 0 || 1 / a === 1 / b;
      }
    
      // Handle NaN vs. NaN
      return a !== a && b !== b;
    };    

    _isSameValue("1","1");
    `),
    );
  });
});

describe('Getters/Setters', () => {
  it('should define getters', async () => {
    assertResult(await compare('let a = { get b() {return 2} }; a.b;'));
  });
  it('should define setters', async () => {
    assertResult(
      await compare(
        'let holder = { set property(argument) {this._secretProp = argument} }; holder.property = 22; false /* dummy expression to catch promise-based setter regression */; holder._secretProp',
      ),
    );
  });
  xit('should register setters properly on host objects', async () => {
    // TODO: fix this
    const tree = parseScript(`holder = { set property(argument) {this._secretProp = argument} };`);
    //@ts-ignore
    const objectExpression = tree.statements[0].expression as AssignmentExpression;
    const interpreter = new Interpreter();
    interpreter.load(tree);
    const obj = RuntimeValue.unwrap(await interpreter.evaluateNext(objectExpression));
    obj.property = 22;
    chai.expect(obj._secretProp).to.equal(22);
  });
  it('should define both', async () => {
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
    assertResult(await compare(src));
  });
});
