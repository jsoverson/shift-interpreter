import { Node, Statement, Expression } from 'shift-ast';
import { BlockType } from './types';

export function isStatement(node: Node): node is Statement {
  return node.type.match(/Statement/) || node.type.match('Declaration') ? true : false;
}

export function isBlockType(node: Node): node is BlockType {
  switch (node.type) {
    case 'Script':
    case 'FunctionBody':
    case 'Block':
      return true;
    default:
      return false;
  }
}

export function isIntermediaryFunction(fn: (...args: any) => any): boolean {
  //@ts-ignore
  return !!fn._interp
}

export function isGetterInternal(obj:any, prop:string) {
  const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
  if (!descriptor) return false;
  return descriptor.get && isIntermediaryFunction(descriptor.get);
}