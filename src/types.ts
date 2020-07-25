import {
  AssignmentTargetIdentifier,
  BindingIdentifier,
  Block,
  DoWhileStatement,
  Expression,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  FunctionBody,
  FunctionDeclaration,
  FunctionExpression,
  Getter,
  IdentifierExpression,
  Method,
  Script,
  Setter,
  Statement,
  Super,
  VariableDeclarator,
  WhileStatement,
} from 'shift-ast';

export type Identifier = BindingIdentifier | IdentifierExpression | AssignmentTargetIdentifier;

export type Loop = ForStatement | WhileStatement | ForOfStatement | ForInStatement | DoWhileStatement;

export type BlockType = Script | Block | FunctionBody;

export type FuncType = FunctionDeclaration | FunctionExpression | Method | Getter | Setter;

export type InstructionNode = Script | Statement | Expression | Super | BlockType | VariableDeclarator;
