import { Script } from 'shift-ast';
export declare function interpretSource(source: string, context?: {}): any;
export declare function interpretTree(tree: Script, context?: {}): any;
export declare const interpret: typeof interpretSource;
export { Interpreter, ReturnValueWithState } from './interpreter';
