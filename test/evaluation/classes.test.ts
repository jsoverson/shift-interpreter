import {assertResult, compare} from '../util';

describe('Classes', () => {
  it('should declare a class', () => {
    assertResult(compare('class A {}; A === A'));
  });
  it('should allow static methods to be called', () => {
    assertResult(compare('class A {static b(){return 20}}; A.b();'));
  });
  it('should allow class to be instantiated methods to be called', () => {
    assertResult(compare('class A {b(){return 2222}}; let a = new A(); a.b();'));
  });
  it('should allow for inheritance', () => {
    assertResult(
      compare('class A {a(){return "AA"}}; class B extends A {b(){return "BB"}} let b = new B(); b.a() + b.b();'),
    );
  });
});
