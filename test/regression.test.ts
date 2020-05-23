import chai from "chai";
import { parseScript } from "shift-parser";
import { Interpreter } from "../src";
import { FunctionDeclaration } from "shift-ast";

describe("regression", () => {
  it("should hoist functions", async () => {
    const src = 'a.b = 2; function a(){}'
    const ast = parseScript(src);
    const interpreter = new Interpreter();
    interpreter.load(ast);
    await interpreter.run();
    const fnDecl = ast.statements.find(st => st.type==='FunctionDeclaration') as FunctionDeclaration;
  
    const fn = () => {
      const value = interpreter.getRuntimeValue(fnDecl.name).unwrap();
      chai.expect(value.b.unwrap()).to.equal(2);
    }
    chai.expect(fn).to.not.throw();
  });
});
