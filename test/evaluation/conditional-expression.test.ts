import {assertResult, compare} from '../util';

describe('conditional expressions', () => {
  it('should evaluate basic conditional expressions', async () => {
    assertResult(await compare('true ? "a" : "b"'));
  });
});
