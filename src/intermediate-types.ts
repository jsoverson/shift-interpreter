import { ArrowExpression, FunctionDeclaration, FunctionExpression, Method, Getter, Setter } from 'shift-ast';
import { InterpreterContext } from './context';
import { Interpreter } from './interpreter';

type FuncType = FunctionDeclaration | FunctionExpression | Method | Getter | Setter;

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
  return function(){
    return (...args:any) => {
      interpreter.pushContext(this as InterpreterContext);
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
