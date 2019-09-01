import { FunctionDeclaration, FunctionExpression } from "shift-ast";
import { Interpreter } from "./interpreter";

export class InterpreterFunction {
  private fn: FunctionDeclaration | FunctionExpression;
  private interpreter: Interpreter;

  constructor(fn: FunctionDeclaration | FunctionExpression, interpreter: Interpreter) {
    this.fn = fn;
    this.interpreter = interpreter;
  }
  execute(args: any[]) {
    this.fn.params.items.forEach((param, i) => {
      if (param.type === 'BindingIdentifier') {
        this.interpreter.updateVariableValue(param, args[i]);
      } else {
        this.interpreter.skipOrThrow(`Param type ${param.type}`);
      }
    });
    return this.interpreter.evaluateBlock(this.fn.body);
  }
}

// export class InterpreterObject {
//   constructor() {
//     this.fn = fn;
//     this.interpreter = interpreter;
//   }
// }
