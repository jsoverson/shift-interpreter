import {assertResult, compare} from '../util';

describe('Classes', () => {
  it('should declare a class', async () => {
    assertResult(await compare('class A {}; A === A'));
  });
  it('should allow static methods to be called', async () => {
    assertResult(await compare('class A {static b(){return 20}}; A.b();'));
  });
  it('should allow class to be instantiated methods to be called', async () => {
    assertResult(await compare('class A {b(){return 2222}}; let a = new A(); a.b();'));
  });
  it('should allow for inheritance', async () => {
    assertResult(
      await compare('class A {a(){return "AA"}}; class B extends A {b(){return "BB"}} let b = new B(); b.a() + b.b();'),
    );
  });
});
