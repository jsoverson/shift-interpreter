import chai from 'chai';
import { parseScript } from 'shift-parser';
import { Interpreter } from '../src';
import { FunctionDeclaration, BindingIdentifier } from 'shift-ast';

describe('Script', () => {
  it('should retain access to variables after script execution', () => {
    const src = '(function(){ const b = 22; }())';
    const ast = parseScript(src);
    const interpreter = new Interpreter();
    interpreter.load(ast);
    interpreter.run();
    // @ts-ignore
    const id = ast.statements[0].expression.callee.body.statements[0].declaration.declarators[0]
      .binding as BindingIdentifier;
    const value = interpreter.getRuntimeValue(id);

    chai.expect(value).to.equal(22);
  });
});
