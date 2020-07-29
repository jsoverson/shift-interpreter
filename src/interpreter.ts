import chalk from 'chalk';
import DEBUG from 'debug';
import { EventEmitter } from 'events';
import {
  ArrayBinding,
  BindingIdentifier,
  BindingWithDefault,
  EmptyStatement,
  Expression,
  Node,
  ObjectBinding,
  Script,
  Statement,
  VariableDeclaration,
  VariableDeclarationStatement,
} from 'shift-ast';
import * as codegen from 'shift-printer';
import shiftScope, { Scope, ScopeLookup, Variable } from 'shift-scope';
import { BasicContext } from './context';
import { InterpreterRuntimeError } from './errors';
import { InstructionBuffer, Instruction } from './instruction-buffer';
import { NodeHandler } from './node-handler';
import { BlockType, FuncType, Identifier, InstructionNode } from './types';
import { isStatement } from './util';

const debug = DEBUG('shift-interpreter');

interface Options {
  skipUnsupported?: boolean;
  handler?: { new (interpreter: Interpreter): NodeHandler };
}

export enum InterpreterEventName {
  COMPLETE = 'complete',
}

export abstract class InterpreterEvent {
  static type = InterpreterEventName;
}

export class InterpreterCompleteEvent extends InterpreterEvent {
  result: any;
  constructor(result: any) {
    super();
    this.result = result;
  }
}
export class Interpreter {
  contexts: BasicContext[] = [];
  globalScope: Scope = shiftScope(new Script({ directives: [], statements: [] }));
  lookupTable: ScopeLookup = new ScopeLookup(this.globalScope);
  scopeMap: WeakMap<Variable, Scope> = new WeakMap();
  scopeOwnerMap: WeakMap<Node, Scope> = new WeakMap();
  variableMap = new Map<Variable, any>();
  options: Options;
  loadedScript: Script = new Script({ directives: [], statements: [] });
  handler: NodeHandler;
  contextProxies = new WeakMap<typeof Proxy, any>();
  pointer = new InstructionBuffer();
  lastStatement: Statement = new EmptyStatement();
  lastInstruction: Instruction = new Instruction(new EmptyStatement(), -1);
  _isReturning: boolean = false;
  _isBreaking: boolean = false;
  _isContinuing: boolean = false;
  errorLocation?: { lastInstruction: Instruction; lastStatement: Statement };

  constructor(options: Options = {}) {
    this.options = options;
    if (this.options.handler) {
      this.handler = new this.options.handler(this);
    } else {
      this.handler = new NodeHandler(this);
    }
  }

  print(node?: Node) {
    return codegen.prettyPrint(node || this.lastInstruction.node);
  }

  logNode(node: Node) {
    codegen.log(node);
  }

  codegen(node: Node) {
    codegen.printTruncated(node);
  }

  skipOrThrow(type: string) {
    if (this.options.skipUnsupported) return;
    throw new InterpreterRuntimeError(`Unsupported node ${type}`);
  }

  load(script: Script, context: BasicContext = {}) {
    debug('loading script');
    this.globalScope = shiftScope(script);
    this.lookupTable = new ScopeLookup(this.globalScope);
    this.buildScopeMap();
    this.loadedScript = script;
    this.pushContext(context);
  }

  private buildScopeMap() {
    const lookupTable = this.lookupTable;
    this.scopeMap = new WeakMap();
    const recurse = (scope: Scope) => {
      this.scopeOwnerMap.set(scope.astNode, scope);
      scope.variableList.forEach((variable: Variable) => {
        this.scopeMap.set(variable, scope);
      });
      scope.children.forEach(recurse);
    };
    recurse(lookupTable.scope);
  }

  pushContext(context: any) {
    this.contexts.push(context);
  }

  popContext() {
    return this.contexts.pop();
  }

  getCurrentContext() {
    if (this.contexts.length === 0) {
      debug('interpreter created with no context, creating empty context.');
      this.pushContext({});
    }
    const context = this.contexts[this.contexts.length - 1];
    if (context === undefined) return this.contexts[0];
    return context;
  }

  getContexts() {
    return this.contexts;
  }

  getContext(index: number) {
    const context = this.contexts[index];
    if (context === undefined) return this.contexts[0];
    return context;
  }

  isReturning(state?: boolean) {
    if (state !== undefined) this._isReturning = state;
    return this._isReturning;
  }

  isBreaking(state?: boolean) {
    if (state !== undefined) this._isBreaking = state;
    return this._isBreaking;
  }

  isContinuing(state?: boolean) {
    if (state !== undefined) this._isContinuing = state;
    return this._isContinuing;
  }

  run(passedNode?: InstructionNode): Promise<any> {
    let nodeToEvaluate: InstructionNode | undefined = undefined;

    if (passedNode) {
      if (passedNode.type === 'Script') {
        this.load(passedNode);
      }
      nodeToEvaluate = passedNode;
    } else if (this.loadedScript) {
      nodeToEvaluate = this.loadedScript;
    }

    if (!this.loadedScript) {
      // If we don't have a currentScript (haven't run load()) but were passed a node
      // the node must be a Statement or Expression (or bad object) and we shouldn't run
      // it without the user knowing what they are doing.
      if (passedNode)
        throw new InterpreterRuntimeError(
          `Can not evaluate ${passedNode.type} node without loading a program (Script node) first.`,
        );
      else throw new InterpreterRuntimeError('No program to evaluate');
    }

    if (!nodeToEvaluate) {
      throw new InterpreterRuntimeError('No program to evaluate');
    }

    debug('starting execution');
    let programResult: any = null;
    try {
      programResult = this.evaluate(nodeToEvaluate);
      debug(`completed execution with result: %o`, programResult);
      return programResult;
    } catch (e) {
      this.errorLocation = {
        lastStatement: this.lastStatement,
        lastInstruction: this.lastInstruction,
      };
      this.handleError(e);
      throw e;
    }
  }
  private handleError(e: any) {
    debug.extend('error')(`Error during execution`);
    if (this.errorLocation) {
      const statementSrc = codegen.printSummary(this.errorLocation.lastStatement);
      const nodeSrc = codegen.printSummary(this.errorLocation.lastInstruction.node);
      console.log(statementSrc.replace(nodeSrc, `👉👉👉${chalk.red(nodeSrc)}`));
    } else {
      console.log('No error location recorded.');
    }
  }

  runToFirstError(passedNode?: Script | Statement | Expression) {
    try {
      return this.run(passedNode);
    } catch (e) {}
  }
  evaluateInstruction(instruction: Instruction) {
    this.lastInstruction = instruction;
    const node = instruction.node;
    if (isStatement(node)) this.lastStatement = node;
    let result = this.handler[node.type](node);
    return (instruction.result = result);
  }
  evaluate(node: InstructionNode | null): any {
    if (node === null) {
      return undefined;
    } else {
      // yeah this looks weird, it's a remnant of when this was all async. You used
      // to be able to stop, start, and break the program but the implementation with native JS promises
      // caused problems. I'm keeping the instruction buffer because hey, maybe it'll come back.
      this.pointer.add(node);
      const instruction = this.pointer.nextInstruction();
      if (!instruction) {
        debug(`no instruction to evaluate, returning`);
        return;
      }
      debug(`evaluating instruction from %o -> %o`, this.lastInstruction.node.type, node.type);
      return this.evaluateInstruction(instruction);
    }
  }
  hoistFunctions(block: BlockType) {
    const functions = block.statements.filter(s => s.type === 'FunctionDeclaration');
    if (functions.length) debug(`hoisting %o functions in %o`, functions.length, block.type);
    for (let fnDecl of functions) {
      this.evaluate(fnDecl);
    }
  }

  hoistVars(block: BlockType) {
    const vars = block.statements
      .filter(
        <(T: Statement) => T is VariableDeclarationStatement>(stmt => stmt.type === 'VariableDeclarationStatement'),
      )
      .filter((decl: VariableDeclarationStatement) => decl.declaration.kind === 'var');
    if (vars.length) debug(`hoisting %o var statements in %o`, vars.length, block.type);
    for (let varDecl of vars) {
      for (let declarator of varDecl.declaration.declarators) this.bindVariable(declarator.binding, undefined);
    }
  }

  declareVariables(decl: VariableDeclaration) {
    for (let declarator of decl.declarators) {
      this.evaluate(declarator);
    }
  }

  createFunction(node: FuncType) {
    const _debug = debug.extend('createFunction');
    let name: string | undefined = undefined;
    if (node.name) {
      switch (node.name.type) {
        case 'BindingIdentifier':
          name = node.name.name;
          break;
        case 'ComputedPropertyName':
          name = this.evaluate(node.name.expression);
          break;
        case 'StaticPropertyName':
          name = node.name.value;
      }
    }

    _debug(`creating intermediary %o: %o`, node.type, name);

    const interpreter = this;

    const fnDebug = debug.extend('function');
    let fn: (this: any, ...args: any) => any;

    // anonymous functions have an empty string as the name
    if (!name) name = '';

    // creating a function like this, i.e. { someName: function(){} )
    // allows us to create a named function by inferring the name from the property value.
    fn = {
      [name]: function(this: any, ...args: any): any {
        fnDebug(`calling intermediary %o: %o`, node.type, name);
        interpreter.pushContext(this);
        const scope = interpreter.scopeOwnerMap.get(node);
        if (scope) {
          const argsRef = scope.variables.get('arguments');
          if (argsRef) interpreter.setRuntimeValue(argsRef, arguments);
        }

        if (node.type === 'Getter') {
          // nothing
        } else if (node.type === 'Setter') {
          fnDebug(`setter: binding passed parameter`);
          interpreter.bindVariable(node.param, args[0]);
        } else {
          node.params.items.forEach(
            (el: ArrayBinding | BindingIdentifier | BindingWithDefault | ObjectBinding, i: number) => {
              fnDebug(`binding function argument %o`, i + 1);
              return interpreter.bindVariable(el, args[i]);
            },
          );
        }
        fnDebug('evaluating function body');
        const result = interpreter.evaluate(node.body);
        fnDebug('completed evaluating function body');

        interpreter.popContext();

        if (new.target) {
          if (interpreter.isReturning()) {
            interpreter.isReturning(false);
            if (typeof result === 'object') return result;
          }
          return this;
        } else {
          if (interpreter.isReturning()) {
            interpreter.isReturning(false);
          }
          return result;
        }
      },
    }[name];

    return Object.assign(fn, { _interp: true });
  }

  bindVariable(binding: BindingIdentifier | ArrayBinding | ObjectBinding | BindingWithDefault, init: any) {
    const _debug = debug.extend('bindVariable');
    switch (binding.type) {
      case 'BindingIdentifier':
        {
          const variables = this.lookupTable.variableMap.get(binding);

          if (variables.length > 1) throw new Error('reproduce this and handle it better');
          const variable = variables[0];
          _debug(`binding %o to %o`, binding.name, init);
          this.setRuntimeValue(variable, init);
        }
        break;
      case 'ArrayBinding':
        {
          for (let i = 0; i < binding.elements.length; i++) {
            const el = binding.elements[i];
            const indexElement = init[i];
            if (el) this.bindVariable(el, indexElement);
          }
          if (binding.rest) this.skipOrThrow('ArrayBinding->Rest/Spread');
        }
        break;
      case 'ObjectBinding':
        {
          for (let i = 0; i < binding.properties.length; i++) {
            const prop = binding.properties[i];
            if (prop.type === 'BindingPropertyIdentifier') {
              const name = prop.binding.name;
              if (init[name] === undefined && prop.init) {
                this.bindVariable(prop.binding, this.evaluate(prop.init));
              } else {
                this.bindVariable(prop.binding, init[name]);
              }
            } else {
              const name =
                prop.name.type === 'ComputedPropertyName' ? this.evaluate(prop.name.expression) : prop.name.value;
              this.bindVariable(prop.binding, init[name]);
            }
          }
          if (binding.rest) this.skipOrThrow('ObjectBinding->Rest/Spread');
        }
        break;
      case 'BindingWithDefault':
        if (init === undefined) {
          _debug(`evaluating default for undefined argument`);
          const defaults = this.evaluate(binding.init);
          _debug(`binding default`);
          this.bindVariable(binding.binding, defaults);
        } else {
          this.bindVariable(binding.binding, init);
        }
        break;
    }
  }
  updateVariableValue(node: Identifier, value: any) {
    const variables = this.lookupTable.variableMap.get(node);

    if (variables.length > 1) throw new Error('reproduce this and handle it better');
    const variable = variables[0];
    const decl = variable.declarations[0];
    if (decl && decl.type.name === 'Const') throw new TypeError('Assignment to constant variable.');
    this.setRuntimeValue(variable, value);
    return value;
  }
  setRuntimeValue(variable: Variable, value: any) {
    this.variableMap.set(variable, value);
  }
  getRuntimeValue(node: Identifier): any {
    const _debug = debug.extend('getVariableValue');
    _debug(`retrieving value for ${node.name}`);
    const variables = this.lookupTable.variableMap.get(node);

    if (!variables) {
      throw new Error(`${node.type} variable not found. Make sure you are passing a valid Identifier node.`);
    }

    if (variables.length > 1) {
      _debug(`>1 variable returned, ${variables}`);
      throw new Error('reproduce this and handle it better');
    }
    const variable = variables[0];

    if (this.variableMap.has(variable)) {
      const value = this.variableMap.get(variable);
      return value;
    } else {
      const contexts = this.getContexts();
      for (let i = contexts.length - 1; i > -1; i--) {
        const context = this.getContext(i);
        if (!context) {
          throw new Error('No context to evaluate in.');
        }
        if (variable.name in context) {
          const value = context[variable.name];
          return value;
        }
      }
      throw new ReferenceError(`${node.name} is not defined`);
    }
  }
}
