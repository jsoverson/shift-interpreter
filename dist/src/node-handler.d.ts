import { Expression, ForInStatement, Script, Statement } from 'shift-ast';
declare type ShiftNode = typeof Script | ForInStatement | Statement | Expression;
declare type NodeHandler = Map<string | ShiftNode, Function>;
export declare const nodeHandler: NodeHandler;
export {};
