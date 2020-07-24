declare module 'shift-scope' {
  export class ScopeLookup {
    scope: GlobalScope;
    variableMap: import('multimap');
    constructor(globalScope: GlobalScope);

    lookup(node: import('shift-ast').Node): Variable;

    isGlobal(node: Scope): node is GlobalScope;
  }

  export class DeclarationType {
    name: string;
    isBlockScoped: boolean;
    isFunctionScoped: boolean;

    constructor(name: string, isBlockScoped: boolean);
    static VAR: FunctionScopedDeclaration;
    static CONST: BlockScopedDeclaration;
    static LET: BlockScopedDeclaration;
    static FUNCTION_DECLARATION: BlockScopedDeclaration;
    static FUNCTION_VAR_DECLARATION: FunctionScopedDeclaration;
    static FUNCTION_NAME: BlockScopedDeclaration;
    static CLASS_DECLARATION: BlockScopedDeclaration;
    static CLASS_NAME: BlockScopedDeclaration;
    static PARAMETER: FunctionScopedDeclaration;
    static CATCH_PARAMETER: BlockScopedDeclaration;
    static IMPORT: BlockScopedDeclaration;
    static fromVarDeclKind: (variableDeclarationKind: string) => FunctionScopedDeclaration | BlockScopedDeclaration;
  }

  export class BlockScopedDeclaration extends DeclarationType {
    constructor(name: string);
  }

  export class FunctionScopedDeclaration extends DeclarationType {
    constructor(name: string);
  }

  export class Declaration {
    node: import('shift-ast').BindingIdentifier | import('shift-ast').AssignmentTargetIdentifier;
    type: DeclarationType;

    constructor(node: import('shift-ast').Node, type: DeclarationType);
  }

  export default function analyze(script: import('shift-ast').Node): Scope;

  export class Accessibility {
    isRead: boolean;
    isWrite: boolean;
    isDelete: boolean;
    isReadWrite: boolean;

    constructor(isRead: boolean, isWrite: boolean, isDelete: boolean);

    static READ: Accessibility;
    static WRITE: Accessibility;
    static READWRITE: Accessibility;
    static DELETE: Accessibility;
  }

  export class Reference {
    node:
      | import('shift-ast').IdentifierExpression
      | import('shift-ast').AssignmentTargetIdentifier
      | import('shift-ast').BindingIdentifier;
    accessibility: Accessibility;
    constructor(node: import('shift-ast').Node, accessibility: Accessibility);
  }

  export class ScopeType<ScopeDefinition> {
    name: ScopeDefinition;
    constructor(name: ScopeDefinition);
    static GLOBAL: ScopeType<ScopeDefinition.GLOBAL>;
    static MODULE: ScopeType<ScopeDefinition.MODULE>;
    static SCRIPT: ScopeType<ScopeDefinition.SCRIPT>;
    static ARROW_FUNCTION: ScopeType<ScopeDefinition.ARROW_FUNCTION>;
    static FUNCTION: ScopeType<ScopeDefinition.FUNCTION>;
    static FUNCTION_NAME: ScopeType<ScopeDefinition.FUNCTION_NAME>;
    static CLASS_NAME: ScopeType<ScopeDefinition.CLASS_NAME>;
    static PARAMETERS: ScopeType<ScopeDefinition.PARAMETERS>;
    static PARAMETER_EXPRESSION: ScopeType<ScopeDefinition.PARAMETER_EXPRESSION>;
    static WITH: ScopeType<ScopeDefinition.WITH>;
    static CATCH: ScopeType<ScopeDefinition.CATCH>;
    static BLOCK: ScopeType<ScopeDefinition.BLOCK>;
  }

  export enum ScopeDefinition {
    GLOBAL = 'Global',
    MODULE = 'Module',
    SCRIPT = 'Script',
    ARROW_FUNCTION = 'ArrowFunction',
    FUNCTION = 'Function',
    FUNCTION_NAME = 'FunctionName',
    CLASS_NAME = 'ClassName',
    PARAMETERS = 'Parameters',
    PARAMETER_EXPRESSION = 'ParameterExpression',
    WITH = 'With',
    CATCH = 'Catch',
    BLOCK = 'Block',
  }

  export class Scope {
    children: Scope[];
    through: import('multimap');
    type: ScopeType<ScopeDefinition>;
    astNode: import('shift-ast').Node;
    variables: Map<string, Variable>;
    variableList: Variable[];
    dynamic: boolean;
    constructor(scope: Scope);
  }
  export class GlobalScope extends Scope {}
  export class Variable {
    name: string;
    references: Reference[];
    declarations: Declaration[];
  }
}
