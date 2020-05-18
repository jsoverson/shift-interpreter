import { ArrowExpression, FunctionDeclaration, FunctionExpression, Method, Getter, Setter, FormalParameters } from 'shift-ast';
import { InterpreterContext } from './context';
import { Interpreter } from './interpreter';

type FuncType = FunctionDeclaration | FunctionExpression | Method | Getter | Setter;

export class xArguments implements ArrayLike<any> {
  callee: (...args: any) => any;
  length:number;
  [x:number]:any;

  constructor(interpreter: Interpreter, callee: (...args: any) => any, params: FormalParameters) {
    this.callee = callee;
    this.length = 0;
    for (let i = 0; i < params.items.length; i++) {
      const item = params.items[i];
    }

  }
}

export function createFunction(fn: FuncType, interpreter: Interpreter) {
  let name = undefined;
  if (fn.name) {
    switch (fn.name.type) {
      case 'BindingIdentifier':
        name = fn.name.name;
        break;
      case 'ComputedPropertyName':
        name = interpreter.evaluateExpression(fn.name.expression);
        break;
      case 'StaticPropertyName':
        name = fn.name.value;
    }
  }

  const fnContainer = {
    [name]: function(...args:any) {
      interpreter.pushContext(this);
      interpreter.argumentsMap.set(this, arguments);
      if (fn.type === 'Getter') {
        // TODO need anything here?
      } else if(fn.type === 'Setter') {
        interpreter.bindVariable(fn.param, args[0]);
      } else {
        fn.params.items.forEach((param, i) => {
          interpreter.bindVariable(param, args[i]);
        });
      }
      const blockResult = interpreter.evaluateBlock(fn.body);
      interpreter.popContext();
      return blockResult.value;
    }
  }
  return fnContainer[name];
}

export function createArrowFunction(fn: ArrowExpression, context: InterpreterContext,  interpreter: Interpreter) {
  return function(this: InterpreterContext){
    return (...args:any) => {
      interpreter.pushContext(this);
      fn.params.items.forEach((param, i) => {
        interpreter.bindVariable(param, args[i]);
      });
      let returnValue = undefined;
      if (fn.body.type === 'FunctionBody') {
        const blockResult = interpreter.evaluateBlock(fn.body);
        returnValue = blockResult.value;
      } else {
        returnValue = interpreter.evaluateExpression(fn.body)
      }
      interpreter.popContext();
      return returnValue;
    }
  }.bind(context)();
}
