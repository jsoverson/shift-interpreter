import { FunctionDeclaration, FunctionExpression, Method } from 'shift-ast';
import { InterpreterContext } from './context';
import { Interpreter } from './interpreter';

type FuncType = FunctionDeclaration | FunctionExpression | Method;

export class IntermediateFunction {
  name: string | null = null;
  private fn: FuncType;
  private interpreter: Interpreter;

  constructor(fn: FuncType, interpreter: Interpreter) {
    this.fn = fn;
    this.interpreter = interpreter;
    if (fn.name) {
      switch (fn.name.type) {
        case 'BindingIdentifier':
          this.name = fn.name.name;
          break;
        case 'ComputedPropertyName':
          this.name = this.interpreter.evaluateExpression(fn.name.expression);
          break;
        case 'StaticPropertyName':
          this.name = fn.name.value;
      }
    }
  }
  execute(args: any[], context?: InterpreterContext) {
    if (context) this.interpreter.pushContext(context);
    this.fn.params.items.forEach((param, i) => {
      if (param.type === 'BindingIdentifier') {
        this.interpreter.updateVariableValue(param, args[i]);
      } else {
        this.interpreter.skipOrThrow(`Param type ${param.type}`);
      }
    });
    const blockResult = this.interpreter.evaluateBlock(this.fn.body);
    this.interpreter.popContext();
    return blockResult.returnValue;
  }
}
