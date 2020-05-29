import chai from 'chai';
import {LiteralBooleanExpression} from 'shift-ast';
import {InstructionBuffer} from '../src/instruction-buffer';

describe('instruction-buffer', () => {
  it('should maintain a stack of instructions and responders', async () => {
    const buffer = new InstructionBuffer();
    const nodeA = new LiteralBooleanExpression({value: true});
    const nodeB = new LiteralBooleanExpression({value: false});
    const order = [];
    async function next() {
      order.push(3);
      buffer.add(nodeB);
      await buffer.awaitExecution();
      order.push(4);
    }
    order.push(1);
    buffer.add(nodeA);
    await buffer.awaitExecution();
    order.push(2);
    await next();
    order.push(5);
    chai.expect(order).to.deep.equal([1, 2, 3, 4, 5]);
  });
});
