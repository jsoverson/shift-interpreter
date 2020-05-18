"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = __importDefault(require("chai"));
const shift_parser_1 = require("shift-parser");
const src_1 = require("../src");
describe("regression", () => {
    it("should not break on querying for function name", () => {
        const src = 'a.b = 2; function a(){}';
        const ast = shift_parser_1.parseScript(src);
        const interpreter = new src_1.Interpreter();
        interpreter.analyze(ast);
        const fnDecls = ast.statements.filter(st => st.type === 'FunctionDeclaration');
        fnDecls.forEach(fnDecl => interpreter.evaluateStatement(fnDecl));
        for (let i = 0; i < ast.statements.length; i++) {
            const stmt = ast.statements[i];
            if (stmt.type === 'FunctionDeclaration')
                continue;
            interpreter.evaluateStatement(stmt);
        }
        const fnDecl = ast.statements[1];
        const fn = () => {
            const value = interpreter.getVariableValue(fnDecl.name);
            chai_1.default.expect(value.b).to.equal(2);
        };
        chai_1.default.expect(fn).to.not.throw();
    });
});
//# sourceMappingURL=regression.test.js.map