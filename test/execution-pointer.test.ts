
import chai from "chai";
import { parseScript } from "shift-parser";
import { Interpreter } from "../src";
import { ExecutionPointer } from "../src/execution-pointer";
import { ExecutionFrame } from "../src/execution-frame";
import { LiteralBooleanExpression } from "shift-ast";

describe("execution-pointer", () => {
  it("should maintain a stack of frames and responders", async() => {
    const pointer = new ExecutionPointer;
    const nodeA = new LiteralBooleanExpression({value:true});
    const nodeB = new LiteralBooleanExpression({value:false});
    const order = [];
    async function next() {
      order.push(3)
      await pointer.queueAndWait(nodeB);
      order.push(4)
    }
    order.push(1);
    await pointer.queueAndWait(nodeA);
    order.push(2);
    await next();
    order.push(5)
    chai.expect(order).to.deep.equal([1,2,3,4,5]);
  });

});
