"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = __importDefault(require("chai"));
const ExecutionPointer_1 = require("../src/ExecutionPointer");
const shift_ast_1 = require("shift-ast");
describe("execution-pointer", () => {
    it("should maintain a stack of frames and responders", async () => {
        const pointer = new ExecutionPointer_1.ExecutionPointer;
        const nodeA = new shift_ast_1.LiteralBooleanExpression({ value: true });
        const nodeB = new shift_ast_1.LiteralBooleanExpression({ value: false });
        const order = [];
        async function next() {
            order.push(3);
            await pointer.queueAndWait(nodeB);
            order.push(4);
        }
        order.push(1);
        await pointer.queueAndWait(nodeA);
        order.push(2);
        await next();
        order.push(5);
        chai_1.default.expect(order).to.deep.equal([1, 2, 3, 4, 5]);
    });
});
//# sourceMappingURL=execution-pointer.test.js.map