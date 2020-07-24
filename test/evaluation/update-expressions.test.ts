import {compare, assertResult} from '../util';

describe('UpdateExpression', () => {
  it('should evaluate operators the same as the host environment', () => {
    assertResult(compare(`let a = 0; let b = a++; b`));
    assertResult(compare(`let a = 0; let b = ++a; b`));
    assertResult(compare(`let a = 0; let b = a--; b`));
    assertResult(compare(`let a = 0; let b = --a; b`));
  });
});
