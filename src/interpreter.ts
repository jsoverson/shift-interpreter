import { Node, ArrayBinding, AssignmentTargetIdentifier, BindingIdentifier, BindingWithDefault, Block, ClassDeclaration, DoWhileStatement, Expression, ForInStatement, ForOfStatement, ForStatement, FunctionBody, FunctionDeclaration, IdentifierExpression, ObjectBinding, Script, Statement, Super, VariableDeclaration, VariableDeclarationStatement, WhileStatement, FunctionExpression, Method, Getter, Setter, ArrowExpression, ExpressionStatement } from 'shift-ast';
import shiftScope, { ScopeLookup } from 'shift-scope';
import { ReturnValueWithState } from './return-value';
import { InterpreterContext } from './context';
import { InterpreterRuntimeError } from './errors';
import { NodeHandler } from './node-handler';
import { isStatement } from './util';
import * as codegen from 'shift-printer';
import chalk from 'chalk';

export type Identifier = BindingIdentifier | IdentifierExpression | AssignmentTargetIdentifier;

type Loop = ForStatement | WhileStatement | ForOfStatement | ForInStatement | DoWhileStatement;

type BlockType = Script | Block | FunctionBody;

type FuncType = FunctionDeclaration | FunctionExpression | Method | Getter | Setter;

interface Options {
  skipUnsupported?: boolean;
  handler?: ({new(interpreter: Interpreter): NodeHandler });
}

export class Interpreter {
  contexts: InterpreterContext[] = [{}];
  globalScope: any;
  scopeLookup: any;
  variableMap = new Map();
  options: Options;
  currentScript?: Script;
  handler: NodeHandler;

  argumentsMap = new WeakMap();
  currentLoops: Loop[] = [];
  currentNode?: Node;
  currentStatement?: Statement;

  constructor(options: Options = {}) {
    this.options = options;
    if (this.options.handler) {
      this.handler = new this.options.handler(this);
    } else {
      this.handler = new NodeHandler(this);
    }
  }
  print(node?:Node) {
    return codegen.prettyPrint(node || this.currentNode);
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
  evaluate(passedNode?: Script | Statement | Expression) {
    let nodeToEvaluate: Script | Statement | Expression | undefined = undefined;

    if (passedNode) {
      if (passedNode.type === 'Script') {
        this.analyze(passedNode);
      }
      nodeToEvaluate = passedNode;
    } else if (this.currentScript) {
      nodeToEvaluate = this.currentScript;
    }

    if (!this.currentScript) {
      // If we don't have a currentScript (haven't run analyze()) but were passed a node
      // the node must be a Statement or Expression (or bad object) and we shouldn't run
      // it without the user knowing what they are doing.
      if (passedNode) throw new InterpreterRuntimeError(`Can not evaluate ${passedNode.type} node without analyzing a host program (Script node) first. If you know what you are doing, use .evaluateStatement() or .evaluateExpression() directly.`)
      else throw new InterpreterRuntimeError('No program to evaluate');
    }

    if (!nodeToEvaluate) {
      throw new InterpreterRuntimeError('No program to evaluate');
    }

    try {
      if (nodeToEvaluate.type === 'Script') {
        return this.evaluateBlock(nodeToEvaluate).value;
      } else if (isStatement(nodeToEvaluate)) {
        return this.evaluateStatement(nodeToEvaluate);
      } else {
        return this.evaluateExpression(nodeToEvaluate);
      }
    } catch (e) {
      const statementSrc = codegen.printSummary(this.currentStatement);
      const currentNodeSrc = codegen.printSummary(this.currentNode);
      console.log(statementSrc.replace(currentNodeSrc, `👉👉👉${chalk.red(currentNodeSrc)}`));
      throw e;
    }
  }
  evaluateToFirstError(passedNode?: Script | Statement | Expression) {
    try {
      this.evaluate(passedNode);
    } catch {

    }
  }
  step() {
    throw new Error("Method not implemented.");
  }
  evaluateBlock(block: BlockType): ReturnValueWithState {
    let value;
    let didBreak = false;
    let didContinue = false;
    let didReturn = false;

    // Hoist function declarations.
    const functions = block.statements.filter(s => s.type === 'FunctionDeclaration');
    functions.forEach(fnDecl => {
      this.evaluateStatement(fnDecl);
    })

    const vars = block.statements
      .filter(<(T: Statement) => T is VariableDeclarationStatement>(stmt => stmt.type === 'VariableDeclarationStatement'))
      .filter((decl:VariableDeclarationStatement) => decl.declaration.kind === 'var');
    vars.forEach(varDecl => {
      this.hoistVars(varDecl);
    })

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
      // skip over functions we've already declared above
      if (statement.type === 'ReturnStatement') debugger;
      if (statement.type !== 'FunctionDeclaration') {
        value = this.evaluateStatement(statement);
      }
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
  hoistVars(varDecl: VariableDeclarationStatement) {
    varDecl.declaration.declarators.forEach(declarator => {
      this.bindVariable(declarator.binding, undefined);
    })
  }
  evaluateStatement(stmt: Statement): ReturnValueWithState | any | void {
    if (!this.contexts) return;
    this.currentNode = stmt;
    this.currentStatement = stmt;
    return this.handler[stmt.type](stmt);    
  }

  declareVariables(decl: VariableDeclaration) {
    decl.declarators.forEach(declarator => {
      this.currentNode = declarator;
      return this.handler.VariableDeclarator(declarator)
    });
  }

  createFunction(fn: FuncType) {
    let name: string | undefined = undefined;
    if (fn.name) {
      switch (fn.name.type) {
        case 'BindingIdentifier':
          name = fn.name.name;
          break;
        case 'ComputedPropertyName':
          name = this.evaluateExpression(fn.name.expression);
          break;
        case 'StaticPropertyName':
          name = fn.name.value;
      }
    }

    const interpreter = this;

    if (name) {
      return ({[name]:function(this: any, ...args:any) {
        interpreter.pushContext(this);
        interpreter.argumentsMap.set(this, arguments);
        if (fn.type === 'Getter') {
          // TODO need anything here?
        } else if(fn.type === 'Setter') {
          interpreter.bindVariable(fn.param, args[0]);
        } else {
          fn.params.items.forEach((param, i) => {
            interpreter.bindVariable(param, args[i]);
          });
        }
        const blockResult = interpreter.evaluateBlock(fn.body);
        interpreter.popContext();
        return blockResult.value;
      }})[name];
    } else {
      return function(this: any, ...args:any) {
        interpreter.pushContext(this);
        interpreter.argumentsMap.set(this, arguments);
        if (fn.type === 'Getter') {
          // TODO need anything here?
        } else if(fn.type === 'Setter') {
          interpreter.bindVariable(fn.param, args[0]);
        } else {
          fn.params.items.forEach((param, i) => {
            interpreter.bindVariable(param, args[i]);
          });
        }
        const blockResult = interpreter.evaluateBlock(fn.body);
        interpreter.popContext();
        return blockResult.value;
      };
    }
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

    if (!variables) {
      throw new Error(`${node.type} variable not found. Make sure you are passing a valid Identifier node.`);
    }

    if (variables.length > 1) throw new Error('reproduce this and handle it better');
    const variable = variables[0];

    if (this.variableMap.has(variable)) {
      return this.variableMap.get(variable);
    } else {
      if (node.name === 'arguments') {
        if (this.argumentsMap.has(this.getCurrentContext())) {
          return this.argumentsMap.get(this.getCurrentContext());
        }
      }
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
    this.currentNode = expr;
    return this.handler[expr.type](expr);
  }
}
