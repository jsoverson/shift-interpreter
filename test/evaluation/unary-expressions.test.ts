import {compare, assertResult} from '../util';

const operators = [
  '+',
  '-',
  '!',
  '~',
  'typeof',
  'void', //, 'delete'
];
// const specialOps = ['in' , 'instanceof'];
describe('UnaryExpressions', () => {
  it('should evaluate operators the same as the host environment', async () => {
    const operands = [2, 120, 1981, '2', 'hi', NaN, true, false, {}, 1 / 0];
    const results = await Promise.allSettled(
      operators.flatMap(op => operands.map(oper => compare(`${op} ${JSON.stringify(oper)}`))),
    );
    results.forEach(result => {
      if (result.status === 'fulfilled') assertResult(result.value);
    });
  });
  it('should evaluate typeof on an undeclared variable', async () => {
    assertResult(await compare(`typeof foo`));
  });
  it('should propagate thrown errors', async () => {
    assertResult(await compare(`try {!(() => n++)();'bad';} catch (e) {'good';}`));
  });
  it('should not swallow continues/breaks', async () => {
    assertResult(await compare(`do{if(!null)continue; nonexistant();}while(i = 0);i`));
  });
});