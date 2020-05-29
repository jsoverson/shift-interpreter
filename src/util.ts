import {Node, Statement} from 'shift-ast';
import {BlockType} from './types';
import {default as nodeReadline} from 'readline';

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

export function isIntermediaryFunction(fn: any): boolean {
  //@ts-ignore
  return typeof fn === 'function' && !!fn._interp;
}

export function isGetterInternal(obj: any, prop: string) {
  const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
  if (!descriptor) return false;
  return descriptor.get && isIntermediaryFunction(descriptor.get);
}

export function createReadlineInterface() {
  const readline = nodeReadline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return (question: string) => {
    return new Promise(resolve => {
      readline.question(question, resolve);
    });
  };
}

export function toString(obj: any): String {
  return obj.toString ? obj.toString() : '' + obj;
}
