import {compare, assertResult} from '../util';

const operators = ['+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '^=', '&='];
// const specialOps = ['in' , 'instanceof'];
describe('CompoundAssignment', () => {
  it('should assign to identifiers', async () => {
    const sample = [2, 120, 1981, '2', 'hi', NaN, true, false, 1 / 0];
    const results = await Promise.allSettled(
      operators.flatMap(op =>
        sample.flatMap(l => sample.map(r => compare(`let b = ${JSON.stringify(l)}; b ${op} ${JSON.stringify(r)}`))),
      ),
    );
    results.forEach(result => {
      if (result.status === 'fulfilled') assertResult(result.value);
    });
  });
  it('should assign to static members', async () => {
    const sample = [2, 120, 1981, '2', 'hi', NaN, true, false, 1 / 0];
    const results = await Promise.allSettled(
      operators.flatMap(op =>
        sample.flatMap(l =>
          sample.map(r => compare(`let b = {a:${JSON.stringify(l)}}; b.a ${op} ${JSON.stringify(r)}`)),
        ),
      ),
    );
    results.forEach(result => {
      if (result.status === 'fulfilled') assertResult(result.value);
    });
  });
  it('should assign to computed members', async () => {
    const sample = [2, 120, 1981, '2', 'hi', NaN, true, false, 1 / 0];
    const results = await Promise.allSettled(
      operators.flatMap(op =>
        sample.flatMap(l =>
          sample.map(r => compare(`let b = {["a"]:${JSON.stringify(l)}}; b["a"] ${op} ${JSON.stringify(r)}`)),
        ),
      ),
    );
    results.forEach(result => {
      if (result.status === 'fulfilled') assertResult(result.value);
    });
  });
});
