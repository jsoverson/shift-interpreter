import { ArrowExpression, FunctionDeclaration, FunctionExpression, Method, Getter, Setter } from 'shift-ast';
import { InterpreterContext } from './context';
import { Interpreter } from './interpreter';
declare type FuncType = FunctionDeclaration | FunctionExpression | Method | Getter | Setter;
export declare function createFunction(fn: FuncType, interpreter: Interpreter): (...args: any) => any;
export declare function createArrowFunction(fn: ArrowExpression, context: InterpreterContext, interpreter: Interpreter): (...args: any) => any;
export {};
