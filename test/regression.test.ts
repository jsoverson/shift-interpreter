import chai from "chai";
import { parseScript } from "shift-parser";
import { Interpreter } from "../src";

describe("regression", () => {
  it("should not break on querying for function name", () => {
    const src = 'a.b = 2; function a(){}'
    const ast = parseScript(src);
    const interpreter = new Interpreter();
    interpreter.analyze(ast);
    const fnDecls = ast.statements.filter(st => st.type==='FunctionDeclaration');
    fnDecls.forEach(fnDecl => interpreter.evaluateStatement(fnDecl));
    for (let i = 0; i < ast.statements.length; i++) {
      const stmt = ast.statements[i];
      if (stmt.type === 'FunctionDeclaration') continue;
      interpreter.evaluateStatement(stmt);
    }
  
    const fnDecl:any = ast.statements[1];
    
    const fn = () => {
      const value = interpreter.getVariableValue(fnDecl.name)
      chai.expect(value.b).to.equal(2);
    }
    chai.expect(fn).to.not.throw();
  });
});
