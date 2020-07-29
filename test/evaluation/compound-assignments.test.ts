import { compare, assertResult } from '../util';

const operators = ['+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '^=', '&='];
// const specialOps = ['in' , 'instanceof'];
describe('CompoundAssignment', () => {
  it('should assign to identifiers', () => {
    const sample = [2, 120, 1981, '2', 'hi', NaN, true, false, 1 / 0];
    const results = operators.flatMap(op =>
      sample.flatMap(l => sample.map(r => compare(`let b = ${JSON.stringify(l)}; b ${op} ${JSON.stringify(r)}`))),
    );
    results.forEach(result => assertResult(result));
  });
  it('should assign to static members', () => {
    const sample = [2, 120, 1981, '2', 'hi', NaN, true, false, 1 / 0];
    const results = operators.flatMap(op =>
      sample.flatMap(l => sample.map(r => compare(`let b = {a:${JSON.stringify(l)}}; b.a ${op} ${JSON.stringify(r)}`))),
    );
    results.forEach(result => assertResult(result));
  });
  it('should assign to computed members', () => {
    const sample = [2, 120, 1981, '2', 'hi', NaN, true, false, 1 / 0];
    const results = operators.flatMap(op =>
      sample.flatMap(l =>
        sample.map(r => compare(`let b = {["a"]:${JSON.stringify(l)}}; b["a"] ${op} ${JSON.stringify(r)}`)),
      ),
    );
    results.forEach(result => assertResult(result));
  });
});
