import chalk from 'chalk';
import {
  ArrayBinding,
  BindingIdentifier,
  BindingWithDefault,
  Expression,
  Node,
  ObjectBinding,
  Script,
  Statement,
  Super,
  VariableDeclaration,
  VariableDeclarationStatement,
  EmptyStatement,
} from 'shift-ast';
import * as codegen from 'shift-printer';
import shiftScope, {ScopeLookup, Variable} from 'shift-scope';
import {InterpreterContext} from './context';
import {InterpreterRuntimeError} from './errors';
import {NodeHandler} from './node-handler';
import {BlockType, InstructionNode, FuncType, Identifier, Loop} from './types';
import {createReadlineInterface, isStatement, isBlockType, isIntermediaryFunction} from './util';
import DEBUG from 'debug';
import {Instruction} from './instruction';
import {InstructionBuffer, InstructionBufferEventName} from './instruction-buffer';
import {RuntimeValue} from './runtime-value';
import {EventEmitter} from 'events';
import {inspect} from 'util';
import {Breakpoint, NodeBreakpoint} from './breakpoint';
import {waterfallMap} from './waterfall';

const debug = DEBUG('shift:interpreter');

interface Options {
  skipUnsupported?: boolean;
  handler?: {new (interpreter: Interpreter): NodeHandler};
}

export enum InterpreterEventName {
  COMPLETE = 'complete',
  CONTINUE = 'continue',
  BREAK = 'break',
}

export abstract class InterpreterEvent {
  static type = InterpreterEventName;
}

export class InterpreterCompleteEvent extends InterpreterEvent {
  result: RuntimeValue<any>;
  constructor(result: RuntimeValue<any>) {
    super();
    this.result = result;
  }
}
export class InterpreterContinueEvent extends InterpreterEvent {
  instruction: Instruction;
  constructor(instruction: Instruction) {
    super();
    this.instruction = instruction;
  }
}
export class InterpreterBreakEvent extends InterpreterEvent {
  instruction: Instruction;
  constructor(instruction: Instruction) {
    super();
    this.instruction = instruction;
  }
}

export class Interpreter extends EventEmitter {
  contexts: InterpreterContext[] = [{}];
  globalScope: any;
  scopeLookup: any;
  variableMap = new Map<Variable, RuntimeValue<any>>();
  options: Options;
  loadedScript: Script = new Script({directives: [], statements: []});
  handler: NodeHandler;
  pointer = new InstructionBuffer();
  breakpoints: Breakpoint[] = [];

  argumentsMap = new WeakMap();
  currentLoops: Loop[] = [];
  lastStatement: Statement = new EmptyStatement();
  lastInstruction: Instruction = new Instruction(new EmptyStatement(), -1);
  nextInstruction: Instruction = new Instruction(new EmptyStatement(), -1);
  hasStarted: boolean = false;

  constructor(options: Options = {}) {
    super();
    this.options = options;
    if (this.options.handler) {
      this.handler = new this.options.handler(this);
    } else {
      this.handler = new NodeHandler(this);
    }
    this.pointer.on(InstructionBufferEventName.CONTINUE, (nextInstruction: Instruction) => {
      this.emit(InterpreterEventName.CONTINUE, new InterpreterContinueEvent(nextInstruction));
    });
    this.pointer.on(InstructionBufferEventName.HALT, (nextInstruction: Instruction) => {
      this.emit(InterpreterEventName.BREAK, new InterpreterBreakEvent(nextInstruction));
    });
  }

  print(node?: Node) {
    return codegen.prettyPrint(node || this.lastInstruction.node);
  }

  // debug(state: boolean = true) {
  //   debug.enabled = true;
  // }

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

  load(script: Script) {
    debug('loading script');
    this.globalScope = shiftScope(script);
    this.scopeLookup = new ScopeLookup(this.globalScope).variableMap;
    this.loadedScript = script;
    this.hasStarted = false;
  }

  pushContext(context: InterpreterContext) {
    this.contexts.push(context);
  }

  popContext() {
    return this.contexts.pop();
  }

  async run(passedNode?: InstructionNode): Promise<RuntimeValue<any>> {
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
          `Can not evaluate ${passedNode.type} node without loading a program (Script node) first. If you know what you are doing, use .evaluateStatement() or .evaluateExpression() directly.`,
        );
      else throw new InterpreterRuntimeError('No program to evaluate');
    }

    if (!nodeToEvaluate) {
      throw new InterpreterRuntimeError('No program to evaluate');
    }

    debug('starting execution');
    this.hasStarted = true;
    const whenBroken = this.onBreak();
    let programResult: null | RuntimeValue<any> = null;
    try {
      const rootEvaluation = this.evaluateNext(nodeToEvaluate).then(result => (programResult = result));

      const returnValue = await Promise.race([
        whenBroken.then((evt: InterpreterBreakEvent) => RuntimeValue.wrap(this.lastInstruction.result)),
        rootEvaluation.then((value: RuntimeValue<any>) => {
          this.emit(InterpreterEventName.COMPLETE, new InterpreterCompleteEvent(value));
          return value;
        }),
      ]);
      debug(`completed execution with result: ${returnValue.unwrap()}`);

      return returnValue;
    } catch (e) {
      this.handleError(e);
      throw e;
    }
  }
  private handleError(e: Error) {
    debug(`Error during execution`);
    const statementSrc = codegen.printSummary(this.lastStatement);
    const nodeSrc = codegen.printSummary(this.lastInstruction.node);
    console.log(statementSrc.replace(nodeSrc, `👉👉👉${chalk.red(nodeSrc)}`));
  }
  onComplete() {
    return new Promise<InterpreterCompleteEvent>((res, rej) => {
      this.once(InterpreterEvent.type.COMPLETE, res);
    });
  }
  onContinue() {
    return new Promise<InterpreterContinueEvent>((res, rej) => {
      this.once(InterpreterEvent.type.CONTINUE, res);
    });
  }
  onBreak() {
    return new Promise<InterpreterBreakEvent>((res, rej) => {
      this.once(InterpreterEvent.type.BREAK, res);
    });
  }
  onHalt() {
    return Promise.race([this.onBreak(), this.onComplete()]);
  }
  runToFirstError(passedNode?: Script | Statement | Expression) {
    return this.run(passedNode).catch(e => {
      console.log(`Error in run, skipping. ${e.message}`);
      return undefined;
    });
  }
  async step() {
    this.pointer.pause();
    debug('stepping');
    if (!this.hasStarted) {
      this.run();
    }
    this.pointer.step();
    return this.onHalt();
  }
  async stepInteractive() {
    const readline = createReadlineInterface();
    outerloop: while (true) {
      const answer = await readline('> ');
      switch (answer) {
        case 'next':
        case 'step':
        case 'n':
        case 's':
        case '':
          const nextInstruction = this.pointer.buffer[0];
          const lastInstruction = this.lastInstruction;
          if (lastInstruction && lastInstruction.result instanceof RuntimeValue) {
            const result = lastInstruction.result.unwrap();
            if (isIntermediaryFunction(result)) {
              console.log(`Result: interpreter intermediary function ${result.name}`);
            } else {
              console.log(`Result:`);
              console.log(inspect(result));
            }
          }
          if (nextInstruction) {
            console.log(`next: ${codegen.printSummary(nextInstruction.node)}`);
          } else if (this.loadedScript) {
            console.log(`next: Script (${this.loadedScript.statements.length} statements)`);
          }
          await this.step();
          break;
        case 'exit':
        case 'quit':
        case 'q':
          break outerloop;
        default:
          console.log(`
command ${answer} not understood.
next, step, n, s, <enter>: step
exit, quit, q: quit
`);
      }
    }
    console.log('exiting');
  }
  pause() {
    debug('pausing');
    this.pointer.pause();
  }
  unpause() {
    debug('unpausing');
    this.pointer.unpause();
  }
  continue() {
    this.unpause();
    return this.onHalt();
  }
  breakAtNode(node: Node) {
    this.breakpoints.push(new NodeBreakpoint(node));
  }
  async evaluateInstruction(instruction: Instruction) {
    this.lastInstruction = instruction;
    let promise;
    if (isBlockType(instruction.node)) {
      promise = this.evaluateBlock(instruction.node);
    } else if (isStatement(instruction.node)) {
      promise = this.evaluateStatement(instruction.node);
    } else if (instruction.node.type === 'VariableDeclarator') {
      promise = this.handler.VariableDeclarator(instruction.node);
    } else {
      promise = this.evaluateExpression(instruction.node);
    }
    const result = RuntimeValue.wrap(await promise);
    instruction.result = result;
    return result;
  }
  async evaluateNext(node: InstructionNode | null): Promise<RuntimeValue<any>> {
    if (!this.contexts) throw new Error('No contexts defined');
    if (node === null) {
      return Promise.resolve(new RuntimeValue(undefined));
    } else {
      const nextInstruction = this.pointer.add(node);
      this.nextInstruction = nextInstruction;
      const triggeredBreaks = this.breakpoints.filter((bp: Breakpoint) => bp.test(this));
      if (triggeredBreaks.length > 0) {
        debug('breakpoint hit');
        this.pause();
      }
      const instruction = await this.pointer.awaitExecution();
      debug(`evaluating instruction (${this.lastInstruction.node.type}->${node.type})`);
      try {
        return this.evaluateInstruction(instruction);
      } catch (e) {
        this.handleError(e);
        throw e;
      }
    }
  }
  evaluateExpression(expr: Expression | Super | null): any {
    if (expr === null) return;
    return this.handler[expr.type](expr);
  }
  evaluateStatement(stmt: Statement): any {
    if (!this.contexts) return;
    this.lastStatement = stmt;
    return this.handler[stmt.type](stmt);
  }
  async evaluateBlock(block: BlockType): Promise<RuntimeValue<any>> {
    let value;
    const _debug = debug.extend('evaluateBlock');
    _debug(`evaluating ${block.type} statements`);

    // Hoist function declarations.
    const functions = block.statements.filter(s => s.type === 'FunctionDeclaration');
    if (functions.length) _debug(`hoisting ${functions.length} functions in ${block.type}`);
    for (let fnDecl of functions) {
      await this.evaluateNext(fnDecl);
    }

    const vars = block.statements
      .filter(
        <(T: Statement) => T is VariableDeclarationStatement>(stmt => stmt.type === 'VariableDeclarationStatement'),
      )
      .filter((decl: VariableDeclarationStatement) => decl.declaration.kind === 'var');
    if (vars.length) _debug(`hoisting ${vars.length} vars in ${block.type}`);
    for (let varDecl of vars) {
      await this.hoistVars(varDecl);
    }

    for (let i = 0; i < block.statements.length; i++) {
      const statement = block.statements[i];

      // skip over functions we've already declared above
      if (statement.type !== 'FunctionDeclaration') {
        _debug(`Evaluating next ${statement.type} in ${block.type}`);
        value = await this.evaluateNext(statement);
        _debug(`${block.type} statement ${statement.type} completed`);
      }
      if (value && value.didBreak) {
        _debug(`break found in block`);
        break;
      }
      if (value && value.didContinue) {
        _debug(`continue found in block`);
        break;
      }
      if (value && value.didReturn) {
        _debug(`returning from block with value: ${value}`);
        return value;
      }
    }
    _debug(`completed ${block.type}, returning with: ${value}`);
    return RuntimeValue.wrap(value);
  }
  async hoistVars(varDecl: VariableDeclarationStatement) {
    for (let declarator of varDecl.declaration.declarators) {
      await this.bindVariable(declarator.binding, RuntimeValue.wrap(undefined));
    }
  }

  async declareVariables(decl: VariableDeclaration) {
    for (let declarator of decl.declarators) {
      await this.evaluateNext(declarator);
    }
  }

  async createFunction(node: FuncType) {
    const _debug = debug.extend('createFunction');
    let name: string | undefined = undefined;
    if (node.name) {
      switch (node.name.type) {
        case 'BindingIdentifier':
          name = node.name.name;
          break;
        case 'ComputedPropertyName':
          name = (await this.evaluateNext(node.name.expression)).unwrap();
          break;
        case 'StaticPropertyName':
          name = node.name.value;
      }
    }

    _debug(`creating intermediary ${node.type} ${name}`);

    const interpreter = this;

    const fnDebug = debug.extend('function');
    let fn: (this: any, ...args: any) => any;

    // anonymous functions have an empty string as the name
    if (!name) name = '';

    // creating a function like this, i.e. { someName: function(){} )
    // allows us to create a named function by inferring the name from the property value.
    fn = {
      [name]: function(this: any, ...args: any): any {
        fnDebug(`calling intermediary ${node.type} ${name}`);
        interpreter.pushContext(this);
        interpreter.argumentsMap.set(this, arguments);

        function bindParams() {
          if (node.type === 'Getter') {
            return Promise.resolve();
          } else if (node.type === 'Setter') {
            fnDebug(`setter: binding passed parameter`);
            return interpreter.bindVariable(node.param, args[0]);
          } else {
            return waterfallMap(
              node.params.items,
              (el: ArrayBinding | BindingIdentifier | BindingWithDefault | ObjectBinding, i: number) => {
                fnDebug(`binding function argument ${i + 1}`);
                return interpreter.bindVariable(el, args[i]);
              },
            );
          }
        }

        // Track https://github.com/microsoft/TypeScript/issues/36307 PR: https://github.com/microsoft/TypeScript/pull/31023
        const interpreterPromise = bindParams()
          //@ts-ignore
          .then(() => {
            fnDebug('evaluating function body');
          })
          .then(() => {
            return interpreter.evaluateNext(node.body);
          })
          .then((blockResult: RuntimeValue<any>) => {
            fnDebug('completed evaluating function body');
            interpreter.popContext();
            return blockResult;
          });
        if (new.target) {
          return interpreterPromise.then((result: RuntimeValue<any>) => {
            if (result.didReturn && typeof result.value === 'object') return result.value;
            else return this;
          });
        } else {
          return interpreterPromise.then((result: RuntimeValue<any>) => result.value);
        }
      },
    }[name];

    return Object.assign(fn, {_interp: true});
  }

  async bindVariable(
    binding: BindingIdentifier | ArrayBinding | ObjectBinding | BindingWithDefault,
    init: RuntimeValue<any>,
  ) {
    const _debug = debug.extend('bindVariable');
    _debug(`${binding.type} => ${init}`);
    init = RuntimeValue.wrap(init);
    const rawInitValue = RuntimeValue.unwrap(init);
    switch (binding.type) {
      case 'BindingIdentifier':
        {
          const variables = this.scopeLookup.get(binding);

          if (variables.length > 1) throw new Error('reproduce this and handle it better');
          const variable = variables[0];
          _debug(`binding ${binding.name} to ${init.unwrap()}`);
          this.variableMap.set(variable, init);
        }
        break;
      case 'ArrayBinding':
        {
          for (let i = 0; i < binding.elements.length; i++) {
            const el = binding.elements[i];
            const indexElement = rawInitValue[i];
            if (el) await this.bindVariable(el, RuntimeValue.wrap(indexElement));
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
              if (rawInitValue[name] === undefined && prop.init) {
                await this.bindVariable(prop.binding, await this.evaluateNext(prop.init));
              } else {
                await this.bindVariable(prop.binding, RuntimeValue.wrap(rawInitValue[name]));
              }
            } else {
              const name =
                prop.name.type === 'ComputedPropertyName'
                  ? (await this.evaluateNext(prop.name.expression)).unwrap()
                  : prop.name.value;
              await this.bindVariable(prop.binding, RuntimeValue.wrap(rawInitValue[name]));
            }
          }
          if (binding.rest) this.skipOrThrow('ObjectBinding->Rest/Spread');
        }
        break;
      case 'BindingWithDefault':
        if (rawInitValue === undefined) {
          _debug(`evaluating default for undefined argument`);
          const defaults = await this.evaluateNext(binding.init);
          _debug(`binding default`);
          await this.bindVariable(binding.binding, defaults);
        } else {
          await this.bindVariable(binding.binding, init);
        }
        break;
    }
  }
  updateVariableValue(node: Identifier, value: any) {
    const variables = this.scopeLookup.get(node);

    if (variables.length > 1) throw new Error('reproduce this and handle it better');
    const variable = variables[0];
    this.variableMap.set(variable, RuntimeValue.wrap(value));
    return value;
  }
  getRuntimeValue(node: Identifier): any {
    const _debug = debug.extend('getVariableValue');
    _debug(`retrieving value for ${node.name}`);
    const variables = this.scopeLookup.get(node);

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
      return RuntimeValue.wrap(value);
    } else {
      if (node.name === 'arguments') {
        if (this.argumentsMap.has(this.getCurrentContext())) {
          return this.argumentsMap.get(this.getCurrentContext());
        }
      }
      for (let i = this.contexts.length - 1; i > -1; i--) {
        if (variable.name in this.contexts[i]) {
          const value = this.contexts[i][variable.name];
          return RuntimeValue.wrap(value);
        }
      }
      throw new ReferenceError(`${node.name} is not defined`);
    }
  }
  getCurrentContext() {
    return this.contexts[this.contexts.length - 1];
  }
}
