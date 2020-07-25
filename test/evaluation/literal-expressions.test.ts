import {expect} from 'chai';
import {Expression, LiteralInfinityExpression} from 'shift-ast';
import {Interpreter} from '../../src/interpreter';
import {assertResult, compare} from '../util';

function evaluate(expr: Expression) {
  const interpreter = new Interpreter();
  return interpreter.evaluate(expr);
}

describe('Literals', () => {
  it('should evaluate LiteralStringExpression', () => {
    assertResult(compare('1/* prevent directive */;"hello"'));
  });
  it('should evaluate LiteralNumericExpression', () => {
    assertResult(compare('20'));
  });
  it('should evaluate LiteralBooleanExpression', () => {
    assertResult(compare('true'));
    assertResult(compare('false'));
  });
  it('should evaluate LiteralInfinityExpression', () => {
    expect(evaluate(new LiteralInfinityExpression())).to.equal(1 / 0);
  });
  it('should evaluate LiteralNullExpression', () => {
    assertResult(compare('null'));
  });
  describe('TemplateStrings', () => {
    it('should evaluate basic templates', () => {
      assertResult(compare('`hello world`'));
    });
    it('should evaluate template strings with embedded expressions', () => {
      assertResult(compare('`hello ${"world"}`'));
    });
    xit('should evaluate tagged template strings', () => {
      // should it though? Deferring support until I run across them in a script I care about.
    });
  });
  describe('regexes', () => {
    it('should be able to pass LiteralRegExpExpressions to string methods', () => {
      assertResult(compare(`"abcd".match(/abcd/)[0] === 'abcd';`));
    });
    it('LiteralRegExpExpressions should be executable as expected', () => {
      assertResult(compare(`/ab/.exec("abcd")`));
    });
    it('should be able to store LiteralRegExpExpressions', () => {
      assertResult(compare(`var a = /ab/; a.exec("abcd")`));
    });
  });
});
