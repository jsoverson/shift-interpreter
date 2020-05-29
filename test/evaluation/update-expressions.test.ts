import {compare, assertResult} from '../util';

describe('UpdateExpression', () => {
  it('should evaluate operators the same as the host environment', async () => {
    assertResult(await compare(`let a = 0; let b = a++; b`));
    assertResult(await compare(`let a = 0; let b = ++a; b`));
    assertResult(await compare(`let a = 0; let b = a--; b`));
    assertResult(await compare(`let a = 0; let b = --a; b`));
  });
});
