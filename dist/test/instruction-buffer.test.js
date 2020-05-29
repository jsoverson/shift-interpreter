"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = __importDefault(require("chai"));
const shift_ast_1 = require("shift-ast");
const instruction_buffer_1 = require("../src/instruction-buffer");
describe("instruction-buffer", () => {
    it("should maintain a stack of instructions and responders", async () => {
        const buffer = new instruction_buffer_1.InstructionBuffer;
        const nodeA = new shift_ast_1.LiteralBooleanExpression({ value: true });
        const nodeB = new shift_ast_1.LiteralBooleanExpression({ value: false });
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
        chai_1.default.expect(order).to.deep.equal([1, 2, 3, 4, 5]);
    });
});
//# sourceMappingURL=instruction-buffer.test.js.map