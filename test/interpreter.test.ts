import chai from 'chai';
import { parseScript } from 'shift-parser';
import { Interpreter } from '../src';

describe('interpreter', () => {
  it('should lookup variable value', () => {
    const src = 'const a = 2, b = 4;';
    const ast = parseScript(src);
    const interpreter = new Interpreter();
    interpreter.run(ast);
    //@ts-ignore
    const value = interpreter.getRuntimeValue(ast.statements[0].declaration.declarators[0].binding);
    chai.expect(value).to.equal(2);
  });
});
