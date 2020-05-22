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
