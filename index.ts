
import { parseScript } from 'shift-parser';
import { Interpreter } from './src/interpreter';
import { Script } from 'shift-ast';
import { InterpreterContext } from './src/context';



export function interpretSource(source: string, context = new InterpreterContext()) {
  return interpretTree(parseScript(source), context);
}

export function interpretTree(tree: Script, context = new InterpreterContext()) {
  const interpreter = new Interpreter(context);
  return interpreter.evaluate(tree);
}

export const interpret = interpretSource;