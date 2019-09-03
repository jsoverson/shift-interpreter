import { FunctionDeclaration, FunctionExpression, Method } from "shift-ast";
import { Interpreter } from "./interpreter";
import { InterpreterContext } from "./context";

type FuncType = FunctionDeclaration | FunctionExpression | Method;

export class InterpreterFunction {
  private fn: FuncType;
  private interpreter: Interpreter;

  constructor(fn: FuncType, interpreter: Interpreter) {
    this.fn = fn;
    this.interpreter = interpreter;
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

// export class InterpreterObject {
//   constructor() {
//     this.fn = fn;
//     this.interpreter = interpreter;
//   }
// }
