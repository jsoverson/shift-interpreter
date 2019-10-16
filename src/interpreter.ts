import {
  ArrayBinding,
  AssignmentTargetIdentifier,
  BindingIdentifier,
  BindingWithDefault,
  Block,
  ClassDeclaration,
  DoWhileStatement,
  Expression,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  FunctionBody,
  FunctionDeclaration,
  IdentifierExpression,
  ObjectBinding,
  Script,
  Statement,
  Super,
  VariableDeclaration,
  WhileStatement,
} from 'shift-ast';
import shiftScope, {ScopeLookup} from 'shift-scope';
import {InterpreterContext} from './context';
import {createFunction} from './intermediate-types';
import {nodeHandler} from './node-handler';
import {isStatement} from './util';

export class InterpreterRuntimeError extends Error {}

export type Identifier = BindingIdentifier | IdentifierExpression | AssignmentTargetIdentifier;

type Loop = ForStatement | WhileStatement | ForOfStatement | ForInStatement | DoWhileStatement;

type BlockType = Script | Block | FunctionBody;

interface Options {
  skipUnsupported?: boolean;
}

export class ReturnValueWithState {
  didReturn = false;
  didBreak = false;
  didContinue = false;
  value: any;

  constructor(value: any, { didReturn = false, didContinue = false, didBreak = false } = {}) {
    this.value = value;
    this.didContinue = didContinue;
    this.didBreak = didBreak;
    this.didReturn = didReturn;
  }
}

export class Interpreter {
  private contexts: InterpreterContext[];
  private globalScope: any;
  private scopeLookup: any;
  private variableMap = new Map();
  private options: Options;
  private currentScript?: Script;
  currentLoops: Loop[] = [];

  constructor(context: InterpreterContext = {}, options: Options = {}) {
    this.contexts = [context];
    this.options = options;
  }
  skipOrThrow(type: string) {
    if (this.options.skipUnsupported) return;
    throw new InterpreterRuntimeError(`Unsupported node ${type}`);
  }
  analyze(script: Script) {
    this.globalScope = shiftScope(script);
    this.scopeLookup = new ScopeLookup(this.globalScope).variableMap;
    this.currentScript = script;
  }
  pushContext(context: InterpreterContext) {
    this.contexts.push(context);
  }
  popContext() {
    return this.contexts.pop();
  }
  evaluate(script?: Script | Statement | Expression) {
    if (!script) {
      if (!this.currentScript) throw new InterpreterRuntimeError('No script to evaluate');
      else script = this.currentScript;
    }
    if (script.type === 'Script') {
      this.currentScript = script;
      this.analyze(script);
      return this.evaluateBlock(script).value;
    } else if (isStatement(script)) {
      return this.evaluateStatement(script);
    } else {
      return this.evaluateExpression(script);
    }
  }
  evaluateBlock(block: BlockType): ReturnValueWithState {
    let value;
    let didBreak = false;
    let didContinue = false;
    let didReturn = false;
    for (let i = 0; i < block.statements.length; i++) {
      const statement = block.statements[i];
      if (statement.type === 'BreakStatement') {
        didBreak = true;
        break;
      }
      if (statement.type === 'ContinueStatement') {
        didContinue = true;
        break;
      }
      value = this.evaluateStatement(statement);
      if (value instanceof ReturnValueWithState) {
        if (value.didReturn) return value;
      }
      if (statement.type === 'ReturnStatement') {
        didReturn = true;
        break;
      }
    }
    return new ReturnValueWithState(value, {didBreak, didContinue, didReturn});
  }
  evaluateStatement(stmt: Statement): ReturnValueWithState | any | void {
    if (!this.contexts) return;
    const handler = nodeHandler.get(stmt.type);
    if (handler) return handler(this, stmt);
    this.skipOrThrow(stmt.type);
  }
  declareClass(decl: ClassDeclaration) {
    const staticMethods: [string, Function][] = [];
    const methods: [string, Function][] = [];
    let constructor: null | Function = null;

    if (decl.elements.length > 0) {
      decl.elements.forEach(el => {
        if (el.method.type === 'Method') {
          const intermediateFunction = createFunction(el.method, this);
          if (el.isStatic) {
            staticMethods.push([intermediateFunction.name!, intermediateFunction]);
          } else {
            if (intermediateFunction.name === 'constructor') constructor = intermediateFunction;
            else methods.push([intermediateFunction.name!, intermediateFunction]);
          }
        } else {
          this.skipOrThrow(`ClassElement type ${el.method.type}`);
        }
      });
    }

    interface DynamicClass {
      [key: string]: any;
    }

    let Class: DynamicClass = class {};

    if (decl.super) {
      Class = ((SuperClass: any = this.evaluateExpression(decl.super)) => {
        if (constructor === null) {
          class InterpreterClassWithExtendsA extends SuperClass {
            constructor(...args: any) {
              super(...args);
            }
          }

          return InterpreterClassWithExtendsA;
        } else {
          class InterpreterClassWithExtendsB extends SuperClass {
            constructor(...args: any) {
              super(...args);
              constructor!(args, this);
            }
          }

          return InterpreterClassWithExtendsB;
        }
      })();
    } else {
      Class = (() => {
        if (constructor === null) {
          class InterpreterClassA {
            constructor() {}
          }

          return InterpreterClassA;
        } else {
          class InterpreterClassB {
            constructor(...args: any) {
              constructor!(args, this);
            }
          }

          return InterpreterClassB;
        }
      })();
    }

    methods.forEach(([name, intermediateFunction]) => {
      Class.prototype[name] = intermediateFunction;
    });

    staticMethods.forEach(([name, intermediateFunction]) => {
      Class[name] = intermediateFunction;
    });

    const variables = this.scopeLookup.get(decl.name);

    variables.forEach((variable: any) => this.variableMap.set(variable, Class));

    return Class;
  }
  declareFunction(decl: FunctionDeclaration) {
    const variables = this.scopeLookup.get(decl.name);

    if (variables.length > 1) throw new Error('reproduce this and handle it better');
    const variable = variables[0];

    const fn = createFunction(decl, this);

    this.variableMap.set(variable, fn);
  }
  declareVariables(decl: VariableDeclaration) {
    decl.declarators.forEach(declarator =>
      this.bindVariable(declarator.binding, this.evaluateExpression(declarator.init)),
    );
  }
  bindVariable(binding: BindingIdentifier | ArrayBinding | ObjectBinding | BindingWithDefault, init: any) {
    switch (binding.type) {
      case 'BindingIdentifier':
        {
          const variables = this.scopeLookup.get(binding);

          if (variables.length > 1) throw new Error('reproduce this and handle it better');
          const variable = variables[0];
          this.variableMap.set(variable, init);
        }
        break;
      case 'ArrayBinding':
        {
          binding.elements.forEach((el, i) => {
            if (el) this.bindVariable(el, init[i]);
          });
          if (binding.rest) this.skipOrThrow('ArrayBinding->Rest/Spread');
        }
        break;
      case 'ObjectBinding':
        {
          binding.properties.forEach(prop => {
            if (prop.type === 'BindingPropertyIdentifier') {
              const name = prop.binding.name;
              if (init[name] === undefined && prop.init) {
                this.bindVariable(prop.binding, this.evaluateExpression(prop.init));
              } else {
                this.bindVariable(prop.binding, init[name]);
              }
            } else {
              const name =
                prop.name.type === 'ComputedPropertyName'
                  ? this.evaluateExpression(prop.name.expression)
                  : prop.name.value;
              this.bindVariable(prop.binding, init[name]);
            }
          });
          if (binding.rest) this.skipOrThrow('ObjectBinding->Rest/Spread');
        }
        break;
      case 'BindingWithDefault':
        if (init === undefined) this.bindVariable(binding.binding, this.evaluateExpression(binding.init));
        else this.bindVariable(binding.binding, init);
        break;
    }
  }
  updateVariableValue(node: Identifier, value: any) {
    const variables = this.scopeLookup.get(node);

    if (variables.length > 1) throw new Error('reproduce this and handle it better');
    const variable = variables[0];
    this.variableMap.set(variable, value);
    return value;
  }
  getVariableValue(node: Identifier): any {
    const variables = this.scopeLookup.get(node);

    if (variables.length > 1) throw new Error('reproduce this and handle it better');
    const variable = variables[0];
    if (this.variableMap.has(variable)) {
      return this.variableMap.get(variable);
    } else {
      for (let i = this.contexts.length - 1; i > -1; i--) {
        if (variable.name in this.contexts[i]) return this.contexts[i][variable.name];
      }
      throw new ReferenceError(`${node.name} is not defined`);
    }
  }
  getCurrentContext() {
    return this.contexts[this.contexts.length - 1];
  }
  evaluateExpression(expr: Expression | Super | null): any {
    // This might be incorrect behavior ¯\_(ツ)_/¯
    if (expr === null) return;

    if (!this.contexts) return;
    const handler = nodeHandler.get(expr.type);
    if (handler) return handler(this, expr);
    return this.skipOrThrow(expr.type);
  }
}
