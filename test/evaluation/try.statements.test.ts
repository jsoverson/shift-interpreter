import {compare, assertResult} from '../util';
import assert from 'assert';

describe('Try/Catch', () => {
  it('should catch errors', () => {
    assertResult(compare(`let msg = ''; try{ throw new Error('err') } catch(e) {msg = e.message} msg`, {Error}));
  });
  it('should allow rethrowing', () => {
    assertResult(compare(`try{ throw new Error('err') } catch(e) {throw e}`, {Error}));
  });
  it('should return from try', () => {
    assertResult(
      compare(
        `
    function returns() {
      try {
        return 11;
      } catch (thrown) {
        return 'not this 1';
      }
      return 'not this 2';
    };
    returns();
    `,
      ),
    );
  });
  it('should be able to return errors from catch', () => {
    const src = `
(function() {
  try {
    null[0];
  } catch (t) {
    return t;
  }
})();`;
    const result = compare(src);
    assert.equal(result.interpreter.errorLocation, undefined);
    assertResult(result);
  });
  it('should return from catch', () => {
    assertResult(
      compare(
        `
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
    `,
        {Error, console},
      ),
    );
  });
});
describe('Try/Finally', () => {
  it('should catch errors', () => {
    assertResult(
      compare(`let msg = ''; try{ throw new Error('err') } catch(e) {msg = e.message} finally {msg+='finally'} msg`, {
        Error,
      }),
    );
  });
});
