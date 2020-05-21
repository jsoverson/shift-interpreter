
import { Statement, Expression } from 'shift-ast';

export function isStatement(node: Statement | Expression): node is Statement {
  return node.type.match(/Statement/) || node.type.match('Declaration') ? true : false;
}

