import {assertResult, compare} from '../util';

describe('Objects', () => {
  it('should not interfere with external promises', () => {
    //@ts-ignore
    const outer = (global.outer = new Promise(res => {
      res(22);
    }));
    assertResult(compare('let inner = this.outer; inner', {outer}));
    //@ts-ignore
    delete global.outer;
  });
  it('should evaluate object expressions and allow static member access', () => {
    assertResult(compare('let a = {b:2}; a.b;'));
  });
  it('should evaluate object expressions and allow computed member access', () => {
    assertResult(compare('let a = {b:2}; a["b"];'));
  });
  it('should evaluate complex objects', () => {
    assertResult(compare('let a = {b:2,c:{ca:"hello"}}; a.c.ca;'));
  });
  it('should evaluate methods on objects', () => {
    assertResult(compare('let a = {b(a){return a}}; a.b(2);'));
  });
  it('should evaluate shorthand props', () => {
    assertResult(compare('let b = 2; let a = {b}; a.b;'));
  });
  // ES2018, not implemented in shift parser yet
  xit('should evaluate objects with rest/spread element', () => {
    assertResult(compare('let b = {a:1,b:2,c:3}; let a = {...b}; a.a+a.b+a.c === b.a+b.b+b.c;'));
  });
  it('should allow for object member assignment', () => {
    assertResult(compare('let a = {}; a.b = 2;'));
    assertResult(compare('let a = {}; a["b"] = 2;'));
  });
});
describe('Arrays', () => {
  it('should parse array expressions', () => {
    assertResult(compare('let a = [1,2,3,4]; a[3];'));
  });
  it('should parse array expressions with spread', () => {
    assertResult(compare('let a = [1,2,3,4], b = [...a];b'));
  });
});
