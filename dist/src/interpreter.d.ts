import { ArrayBinding, AssignmentTargetIdentifier, BindingIdentifier, BindingWithDefault, Block, ClassDeclaration, DoWhileStatement, Expression, ForInStatement, ForOfStatement, ForStatement, FunctionBody, FunctionDeclaration, IdentifierExpression, ObjectBinding, Script, Statement, Super, VariableDeclaration, WhileStatement } from 'shift-ast';
import { InterpreterContext } from './context';
export declare class InterpreterRuntimeError extends Error {
}
export declare type Identifier = BindingIdentifier | IdentifierExpression | AssignmentTargetIdentifier;
export interface DynamicClass {
    [key: string]: any;
}
declare type Loop = ForStatement | WhileStatement | ForOfStatement | ForInStatement | DoWhileStatement;
declare type BlockType = Script | Block | FunctionBody;
interface Options {
    skipUnsupported?: boolean;
}
export declare class ReturnValueWithState {
    didReturn: boolean;
    didBreak: boolean;
    didContinue: boolean;
    value: any;
    constructor(value: any, { didReturn, didContinue, didBreak }?: {
        didReturn?: boolean | undefined;
        didContinue?: boolean | undefined;
        didBreak?: boolean | undefined;
    });
}
export declare class Interpreter {
    private contexts;
    private globalScope;
    private scopeLookup;
    private variableMap;
    private options;
    private currentScript?;
    currentLoops: Loop[];
    constructor(context?: InterpreterContext, options?: Options);
    skipOrThrow(type: string): void;
    analyze(script: Script): void;
    pushContext(context: InterpreterContext): void;
    popContext(): InterpreterContext | undefined;
    evaluate(script?: Script | Statement | Expression): any;
    evaluateBlock(block: BlockType): ReturnValueWithState;
    evaluateStatement(stmt: Statement): ReturnValueWithState | any | void;
    declareClass(decl: ClassDeclaration): DynamicClass;
    declareFunction(decl: FunctionDeclaration): void;
    declareVariables(decl: VariableDeclaration): void;
    bindVariable(binding: BindingIdentifier | ArrayBinding | ObjectBinding | BindingWithDefault, init: any): void;
    updateVariableValue(node: Identifier, value: any): any;
    getVariableValue(node: Identifier): any;
    getCurrentContext(): InterpreterContext;
    evaluateExpression(expr: Expression | Super | null): any;
}
export {};
