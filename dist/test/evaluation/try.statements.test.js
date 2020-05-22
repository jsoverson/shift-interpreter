"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
describe("Try/Catch", () => {
    it("should catch errors", async () => {
        util_1.assertResult(await util_1.compare(`let msg = ''; try{ throw new Error('err') } catch(e) {msg = e.message} msg`, { Error }));
    });
    it("should allow rethrowing", async () => {
        util_1.assertResult(await util_1.compare(`try{ throw new Error('err') } catch(e) {throw e}`, { Error }));
    });
    it('should return from catch', async () => {
        util_1.assertResult(await util_1.compare(`
    let assert = {};
    function assertThrows(expectedErrorConstructor, func) {
      try {
        func();
      } catch (thrown) {
        if (thrown.constructor !== expectedErrorConstructor) {
          return 'Expected a ' + expectedErrorConstructor.name + ' but got a ' + thrown.constructor.name;
        }
        return 'OK';
      }
      return 'Expected a ' + expectedErrorConstructor.name + ' to be thrown but no exception was thrown at all';
    };

    assertThrows(Error, () => { throw new Error() })
    `, { Error, console }));
    });
});
describe("Try/Finally", () => {
    it("should catch errors", async () => {
        util_1.assertResult(await util_1.compare(`let msg = ''; try{ throw new Error('err') } catch(e) {msg = e.message} finally {msg+='finally'} msg`, { Error }));
    });
});
//# sourceMappingURL=try.statements.test.js.map