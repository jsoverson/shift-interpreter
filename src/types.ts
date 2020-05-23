import { BindingIdentifier, IdentifierExpression, AssignmentTargetIdentifier, ForStatement, WhileStatement, ForOfStatement, ForInStatement, DoWhileStatement, Block, FunctionBody, FunctionDeclaration, FunctionExpression, Method, Getter, Setter, Statement, Expression, Super, VariableDeclarator } from "shift-ast";
import { Script } from "shift-ast";

export type Identifier = BindingIdentifier | IdentifierExpression | AssignmentTargetIdentifier;

export type Loop = ForStatement | WhileStatement | ForOfStatement | ForInStatement | DoWhileStatement;

export type BlockType = Script | Block | FunctionBody;

export type FuncType = FunctionDeclaration | FunctionExpression | Method | Getter | Setter;

export type FrameNode = Script | Statement | Expression | Super | BlockType | VariableDeclarator;

