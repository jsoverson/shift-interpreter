"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = __importDefault(require("chai"));
const shift_parser_1 = require("shift-parser");
const src_1 = require("../src");
describe("execution-pointer", () => {
    it("should lookup variable value", () => {
        const src = 'const a = 2, b = 4;';
        const ast = shift_parser_1.parseScript(src);
        const interpreter = new src_1.Interpreter();
        interpreter.run(ast);
        //@ts-ignore
        const value = interpreter.getVariableValue(ast.statements[0].declaration.declarators[0].binding);
        chai_1.default.expect(value).to.equal(2);
    });
});
//# sourceMappingURL=execution-frame.test.js.map