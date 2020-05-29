"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = __importDefault(require("chai"));
const shift_parser_1 = require("shift-parser");
const src_1 = require("../src");
describe("Script", () => {
    it("should retain access to variables after script execution", async () => {
        const src = '(function(){ const b = 22; }())';
        const ast = shift_parser_1.parseScript(src);
        const interpreter = new src_1.Interpreter();
        interpreter.load(ast);
        await interpreter.run();
        // @ts-ignore
        const id = ast.statements[0].expression.callee.body.statements[0].declaration.declarators[0].binding;
        const value = interpreter.getRuntimeValue(id);
        chai_1.default.expect(value.unwrap()).to.equal(22);
    });
});
//# sourceMappingURL=script.test.js.map