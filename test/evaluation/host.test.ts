import {assertResult, compare} from '../util';

describe('host', () => {
  describe('ffi', () => {
    it('should have access to simple values in the context', () => {
      assertResult(compare('let b = a; b;', {a: ''}));
    });
    it('should have access to complex values in the context', () => {
      class A {
        prop: number;
        constructor() {
          this.prop = 222;
        }
      }
      assertResult(compare('let b = new A(); b.prop;', {A}));
    });
  });
  describe('literal regexes', () => {
    // it('should declare and init variables and be able to retrieve the value', () => {
    //   assertResult(compare('let a = 2; a;'));
    // });
  });
});
