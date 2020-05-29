"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const util_1 = require("../util");
mocha_1.describe('new', () => {
    it('should instantiate functions and retain prototype chain', async () => {
        util_1.assertResult(await util_1.compare(`
      function d() {}
      d.prototype.run = function () {return "expected"};
      d.prototype.run();
      const a = new d();
      a.run();
    `));
    });
    it('should return the return value for an instantiated function if the fn returns', async () => {
        util_1.assertResult(await util_1.compare(`
      function d() { return { run() {return 'this one'}}; }
      d.prototype.run = function () {return "not this one"};
      d.prototype.run();
      const a = new d();
      a.run();
    `));
    });
    it('should still return the "this" if a primitive is returned', async () => {
        util_1.assertResult(await util_1.compare(`
      function d() { return 2; }
      d.prototype.run = function () {return "expected"};
      d.prototype.run();
      const a = new d();
      a.run();
    `));
    });
});
//# sourceMappingURL=new-expression.test.js.map