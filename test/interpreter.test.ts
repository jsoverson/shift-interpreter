import chai from "chai";
import { parseScript } from "shift-parser";
import { Interpreter } from "../src";

describe("interpreter", () => {
  it("should lookup variable value", async () => {
    const src = 'const a = 2, b = 4;'
    const ast = parseScript(src);
    const interpreter = new Interpreter();
    await interpreter.run(ast);
    //@ts-ignore
    const value = interpreter.getRuntimeValue(ast.statements[0].declaration.declarators[0].binding).unwrap();
    chai.expect(value).to.equal(2);
  });
  it("should step through execution", async () => {
    const src = 'const a = 2, b = 4;'
    const ast = parseScript(src);
    const interpreter = new Interpreter();
    interpreter.load(ast);
    const frame = interpreter.getExecutionFrame();
    chai.expect(frame).to.be.undefined;
    await interpreter.step();
    let nextFrame = interpreter.getExecutionFrame();
    chai.expect(nextFrame!.node.type).to.equal('Script');
    await interpreter.step();
    nextFrame = interpreter.getExecutionFrame();
    chai.expect(nextFrame!.node.type).to.equal('VariableDeclarationStatement');
    await interpreter.step();
    nextFrame = interpreter.getExecutionFrame();
    chai.expect(nextFrame!.node.type).to.equal('VariableDeclarator');
  });
  it("should step through expression by expression", async () => {
    const src = 'let a = 2; a = 4;'
    const ast = parseScript(src);
    const interpreter = new Interpreter();
    interpreter.load(ast);
    //@ts-ignore
    const identifier = ast.statements[0].declaration.declarators[0].binding;
    await interpreter.step();
    await interpreter.step();
    await interpreter.step();
    await interpreter.step();
    let idVal = interpreter.getRuntimeValue(identifier).unwrap();
    await interpreter.step();
    await interpreter.step();
    await interpreter.step();
    idVal = interpreter.getRuntimeValue(identifier).unwrap();
    chai.expect(idVal).to.equal(4);
  });
});
