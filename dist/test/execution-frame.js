"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = __importDefault(require("chai"));
const shift_parser_1 = require("shift-parser");
const src_1 = require("../src");
describe("interpreter", () => {
    it("should lookup variable value", () => {
        const src = 'const a = 2, b = 4;';
        const ast = shift_parser_1.parseScript(src);
        const interpreter = new src_1.Interpreter();
        interpreter.run(ast);
        //@ts-ignore
        const value = interpreter.getVariableValue(ast.statements[0].declaration.declarators[0].binding);
        chai_1.default.expect(value).to.equal(2);
    });
    it("should return current and next execution expression", () => {
        const src = 'const a = 2, b = 4;';
        const ast = shift_parser_1.parseScript(src);
        const interpreter = new src_1.Interpreter();
        interpreter.analyze(ast);
        const node = interpreter.getExecutionPointer();
        chai_1.default.expect(node).to.be.undefined;
        let nextNode = interpreter.getNextExecutionPointer();
        chai_1.default.expect(nextNode.type).to.equal('VariableDeclarationStatement');
        nextNode = interpreter.getNextExecutionPointer();
        chai_1.default.expect(nextNode.type).to.equal('VariableDeclarator');
        nextNode = interpreter.getNextExecutionPointer();
        chai_1.default.expect(nextNode.type).to.equal('LiteralNumericExpression');
    });
    // it("should step through expression by expression", () => {
    //   const src = 'let a = 2; a = 4; a = 2 + 2;'
    //   const ast = parseScript(src);
    //   const interpreter = new Interpreter();
    //   interpreter.analyze(ast);
    //   //@ts-ignore
    //   const identifier = ast.statements[0].declaration.declarators[0].binding;
    //   const st1val = interpreter.step();
    //   chai.expect(st1val).to.equal(2);
    //   let idVal = interpreter.getVariableValue(identifier);
    //   chai.expect(idVal).to.equal(2);
    // });
});
//# sourceMappingURL=execution-frame.js.map