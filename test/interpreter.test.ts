import chai from "chai";
import { parseScript } from "shift-parser";
import { Interpreter } from "../src";
import { LiteralNumericExpression, BindingIdentifier } from "shift-ast";

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
    chai.expect(interpreter.lastInstruction.node.type).to.equal('EmptyStatement');
    await interpreter.step();
    chai.expect(interpreter.lastInstruction.node.type).to.equal('Script');
    await interpreter.step();
    chai.expect(interpreter.lastInstruction.node.type).to.equal('VariableDeclarationStatement');
    await interpreter.step();
    chai.expect(interpreter.lastInstruction.node.type).to.equal('VariableDeclarator');
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
    chai.expect(idVal).to.equal(2);
    await interpreter.step();
    await interpreter.step();
    await interpreter.step();
    idVal = interpreter.getRuntimeValue(identifier).unwrap();
    chai.expect(idVal).to.equal(4);
  });
  it("should break at specified node", async () => {
    const src = 'let a = 2; a = 4;'
    const ast = parseScript(src);
    const interpreter = new Interpreter();
    interpreter.load(ast);
    //@ts-ignore
    const identifier = ast.statements[0].declaration.declarators[0].binding as BindingIdentifier;
    //@ts-ignore
    const num = ast.statements[1].expression.expression as LiteralNumericExpression;
    interpreter.breakAtNode(num);
    const completionPromise = interpreter.onComplete();
    let completed = false;
    completionPromise.then(x => completed = true);
    await interpreter.run();
    let idVal = interpreter.getRuntimeValue(identifier).unwrap();
    chai.expect(idVal).to.equal(2);
    chai.expect(completed).to.be.false;
    await interpreter.continue();
    idVal = interpreter.getRuntimeValue(identifier).unwrap();
    chai.expect(idVal).to.equal(4);
    chai.expect(completed).to.be.true;
  });
});
