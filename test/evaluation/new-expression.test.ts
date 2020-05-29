import {describe} from 'mocha';
import {assertResult, compare} from '../util';

describe('new', () => {
  it('should instantiate functions and retain prototype chain', async () => {
    assertResult(
      await compare(`
      function d() {}
      d.prototype.run = function () {return "expected"};
      d.prototype.run();
      const a = new d();
      a.run();
    `),
    );
  });

  it('should return the return value for an instantiated function if the fn returns', async () => {
    assertResult(
      await compare(`
      function d() { return { run() {return 'this one'}}; }
      d.prototype.run = function () {return "not this one"};
      d.prototype.run();
      const a = new d();
      a.run();
    `),
    );
  });
  it('should still return the "this" if a primitive is returned', async () => {
    assertResult(
      await compare(`
      function d() { return 2; }
      d.prototype.run = function () {return "expected"};
      d.prototype.run();
      const a = new d();
      a.run();
    `),
    );
  });
});
