"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = __importDefault(require("chai"));
const shift_parser_1 = require("shift-parser");
const src_1 = require("../src");
describe("interpreter", () => {
    it("should lookup variable value", async () => {
        const src = 'const a = 2, b = 4;';
        const ast = shift_parser_1.parseScript(src);
        const interpreter = new src_1.Interpreter();
        await interpreter.run(ast);
        //@ts-ignore
        const value = interpreter.getRuntimeValue(ast.statements[0].declaration.declarators[0].binding).unwrap();
        chai_1.default.expect(value).to.equal(2);
    });
    it("should step through execution", async () => {
        const src = 'const a = 2, b = 4;';
        const ast = shift_parser_1.parseScript(src);
        const interpreter = new src_1.Interpreter();
        interpreter.load(ast);
        chai_1.default.expect(interpreter.lastInstruction.node.type).to.equal('EmptyStatement');
        await interpreter.step();
        chai_1.default.expect(interpreter.lastInstruction.node.type).to.equal('Script');
        await interpreter.step();
        chai_1.default.expect(interpreter.lastInstruction.node.type).to.equal('VariableDeclarationStatement');
        await interpreter.step();
        chai_1.default.expect(interpreter.lastInstruction.node.type).to.equal('VariableDeclarator');
    });
    it("should step through expression by expression", async () => {
        const src = 'let a = 2; a = 4;';
        const ast = shift_parser_1.parseScript(src);
        const interpreter = new src_1.Interpreter();
        interpreter.load(ast);
        //@ts-ignore
        const identifier = ast.statements[0].declaration.declarators[0].binding;
        await interpreter.step();
        await interpreter.step();
        await interpreter.step();
        await interpreter.step();
        let idVal = interpreter.getRuntimeValue(identifier).unwrap();
        chai_1.default.expect(idVal).to.equal(2);
        await interpreter.step();
        await interpreter.step();
        await interpreter.step();
        idVal = interpreter.getRuntimeValue(identifier).unwrap();
        chai_1.default.expect(idVal).to.equal(4);
    });
    it("should break at specified node", async () => {
        const src = 'let a = 2; a = 4;';
        const ast = shift_parser_1.parseScript(src);
        const interpreter = new src_1.Interpreter();
        interpreter.load(ast);
        //@ts-ignore
        const identifier = ast.statements[0].declaration.declarators[0].binding;
        //@ts-ignore
        const num = ast.statements[1].expression.expression;
        interpreter.breakAtNode(num);
        const completionPromise = interpreter.onComplete();
        let completed = false;
        completionPromise.then(x => completed = true);
        await interpreter.run();
        let idVal = interpreter.getRuntimeValue(identifier).unwrap();
        chai_1.default.expect(idVal).to.equal(2);
        chai_1.default.expect(completed).to.be.false;
        await interpreter.continue();
        idVal = interpreter.getRuntimeValue(identifier).unwrap();
        chai_1.default.expect(idVal).to.equal(4);
        chai_1.default.expect(completed).to.be.true;
    });
});
//# sourceMappingURL=interpreter.test.js.map