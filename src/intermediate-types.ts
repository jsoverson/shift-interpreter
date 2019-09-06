import { ArrowExpression, FunctionDeclaration, FunctionExpression, Method } from 'shift-ast';
import { InterpreterContext } from './context';
import { Interpreter } from './interpreter';

type FuncType = FunctionDeclaration | FunctionExpression | Method;

export class InterpreterFunction {
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
      this.interpreter.bindVariable(param, args[i]);
    });
    const blockResult = this.interpreter.evaluateBlock(this.fn.body);
    if (context) this.interpreter.popContext();
    return blockResult.returnValue;
  }
}

export class InterpreterArrowFunction {
  name: string | null = null;
  private fn: ArrowExpression;
  private context: InterpreterContext;
  private interpreter: Interpreter;

  constructor(fn: ArrowExpression, context: InterpreterContext,  interpreter: Interpreter) {
    this.fn = fn;
    this.context = context;
    this.interpreter = interpreter;
  }
  execute(args: any[]) {
    this.interpreter.pushContext(this.context);
    this.fn.params.items.forEach((param, i) => {
      this.interpreter.bindVariable(param, args[i]);
    });
    let returnValue = undefined;
    if (this.fn.body.type === 'FunctionBody') {
      const blockResult = this.interpreter.evaluateBlock(this.fn.body);
      returnValue = blockResult.returnValue;
    } else {
      returnValue = this.interpreter.evaluateExpression(this.fn.body)
    }
    this.interpreter.popContext();
    return returnValue;
  }
}
