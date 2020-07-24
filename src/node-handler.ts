import {
  ArrayExpression,
  ArrowExpression,
  AssignmentExpression,
  BinaryExpression,
  BlockStatement,
  CallExpression,
  ClassDeclaration,
  CompoundAssignmentExpression,
  ComputedMemberExpression,
  ConditionalExpression,
  DoWhileStatement,
  ExpressionStatement,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  FunctionDeclaration,
  FunctionExpression,
  IdentifierExpression,
  IfStatement,
  LiteralBooleanExpression,
  LiteralInfinityExpression,
  LiteralNullExpression,
  LiteralNumericExpression,
  LiteralRegExpExpression,
  LiteralStringExpression,
  NewExpression,
  ObjectExpression,
  ReturnStatement,
  StaticMemberExpression,
  TemplateExpression,
  ThisExpression,
  ThrowStatement,
  TryCatchStatement,
  TryFinallyStatement,
  UnaryExpression,
  UpdateExpression,
  VariableDeclarationStatement,
  VariableDeclarator,
  WhileStatement,
  Block,
  FunctionBody,
  Script,
} from 'shift-ast';
import {InterpreterRuntimeError} from './errors';
import {Interpreter} from './interpreter';
import {binaryOperatorMap, compoundAssignmentOperatorMap, unaryOperatorMap} from './operators';
import DEBUG from 'debug';
import {isIntermediaryFunction, isGetterInternal, toString} from './util';
import * as codegen from 'shift-printer';
import {BasicContext} from './context';
import {BlockType} from './types';
import {interpret} from '.';

export interface DynamicClass {
  [key: string]: any;
}

const debug = DEBUG('shift:interpreter:node-handler');

export class NodeHandler {
  interpreter: Interpreter;

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter;
  }

  async ReturnStatement(stmt: ReturnStatement) {
    const value = await this.interpreter.evaluateNext(stmt.expression);
    this.interpreter.isReturning(true);
    return value;
  }

  async ExpressionStatement(stmt: ExpressionStatement) {
    return await this.interpreter.evaluateNext(stmt.expression);
  }
  async VariableDeclarationStatement(stmt: VariableDeclarationStatement) {
    return this.interpreter.declareVariables(stmt.declaration);
  }

  async VariableDeclarator(declarator: VariableDeclarator) {
    const value = await this.interpreter.evaluateNext(declarator.init);
    return this.interpreter.bindVariable(declarator.binding, value);
  }

  async FunctionDeclaration(decl: FunctionDeclaration) {
    const variables = this.interpreter.lookupTable.variableMap.get(decl.name);

    if (variables.length > 1) throw new Error('reproduce this and handle it better');
    const variable = variables[0];

    const fn = await this.interpreter.createFunction(decl);

    this.interpreter.variableMap.set(variable, fn);
  }

  async BlockStatement(stmt: BlockStatement) {
    return await this.interpreter.evaluateNext(stmt.block);
  }

  async ClassDeclaration(decl: ClassDeclaration) {
    const staticMethods: [string, Function][] = [];
    const methods: [string, Function][] = [];
    let constructor: null | Function = null;

    if (decl.elements.length > 0) {
      for (let el of decl.elements) {
        if (el.method.type === 'Method') {
          const intermediateFunction = await this.interpreter.createFunction(el.method);
          if (el.isStatic) {
            staticMethods.push([intermediateFunction.name!, intermediateFunction]);
          } else {
            if (intermediateFunction.name === 'constructor') constructor = intermediateFunction;
            else methods.push([intermediateFunction.name!, intermediateFunction]);
          }
        } else {
          this.interpreter.skipOrThrow(`ClassElement type ${el.method.type}`);
        }
      }
    }

    let Class: DynamicClass = class {};

    if (decl.super) {
      const xtends = await this.interpreter.evaluateNext(decl.super);
      Class = ((SuperClass: any = xtends) => {
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

    const variables = this.interpreter.lookupTable.variableMap.get(decl.name);

    variables.forEach((variable: any) => this.interpreter.variableMap.set(variable, Class));

    return Class;
  }

  async IfStatement(stmt: IfStatement) {
    const test = await this.interpreter.evaluateNext(stmt.test);
    if (test) return this.interpreter.evaluateNext(stmt.consequent);
    else if (stmt.alternate) return this.interpreter.evaluateNext(stmt.alternate);
  }

  async ConditionalExpression(stmt: ConditionalExpression) {
    const test = await this.interpreter.evaluateNext(stmt.test);
    if (test) return this.interpreter.evaluateNext(stmt.consequent);
    else if (stmt.alternate) return this.interpreter.evaluateNext(stmt.alternate);
  }

  async ThrowStatement(stmt: ThrowStatement) {
    const error = await this.interpreter.evaluateNext(stmt.expression);
    throw error;
  }

  async TryCatchStatement(stmt: TryCatchStatement) {
    let returnValue = undefined;
    try {
      returnValue = await this.interpreter.evaluateNext(stmt.body);
      if (returnValue.didReturn) return returnValue;
    } catch (e) {
      await this.interpreter.bindVariable(stmt.catchClause.binding, e);
      returnValue = await this.interpreter.evaluateNext(stmt.catchClause.body);
      if (returnValue.didReturn) return returnValue;
    }
    return returnValue;
  }

  async TryFinallyStatement(stmt: TryFinallyStatement) {
    let returnValue = undefined;
    if (stmt.catchClause) {
      try {
        returnValue = await this.interpreter.evaluateNext(stmt.body);
        if (returnValue.didReturn) return returnValue;
      } catch (e) {
        await this.interpreter.bindVariable(stmt.catchClause.binding, e);
        returnValue = await this.interpreter.evaluateNext(stmt.catchClause.body);
        if (returnValue.didReturn) return returnValue;
      } finally {
        returnValue = await this.interpreter.evaluateNext(stmt.finalizer);
        if (returnValue.didReturn) return returnValue;
      }
    } else {
      try {
        returnValue = await this.interpreter.evaluateNext(stmt.body);
        if (returnValue.didReturn) return returnValue;
      } finally {
        returnValue = await this.interpreter.evaluateNext(stmt.finalizer);
        if (returnValue.didReturn) return returnValue;
      }
    }
    return returnValue;
  }

  async Block(block: Block) {
    let value;
    const _debug = debug.extend('Block');

    await this.interpreter.hoistFunctions(block);
    await this.interpreter.hoistVars(block);
    const statements = block.statements.filter(stmt => stmt.type !== 'FunctionDeclaration');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      _debug(`Evaluating next ${statement.type} in ${block.type}`);
      value = await this.interpreter.evaluateNext(statement);
      _debug(`${block.type} statement ${statement.type} completed`);
    }
    _debug(`completed ${block.type}, returning with: ${value}`);
    return value;
  }

  async FunctionBody(body: FunctionBody) {
    let value;
    const _debug = debug.extend(body.type);

    await this.interpreter.hoistFunctions(body);
    await this.interpreter.hoistVars(body);
    const statements = body.statements.filter(stmt => stmt.type !== 'FunctionDeclaration');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      _debug(`Evaluating ${statement.type} in ${body.type}`);
      value = await this.interpreter.evaluateNext(statement);
      _debug(`${body.type} statement ${statement.type} completed`);
      if (this.interpreter.isReturning()) {
        break;
      }
    }
    _debug(`completed ${body.type}, returning with: ${value}`);
    return value;
  }

  async Script(body: Script) {
    let value;
    const _debug = debug.extend(body.type);

    await this.interpreter.hoistFunctions(body);
    await this.interpreter.hoistVars(body);
    const statements = body.statements.filter(stmt => stmt.type !== 'FunctionDeclaration');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      _debug(`Evaluating ${statement.type} in ${body.type}`);
      value = await this.interpreter.evaluateNext(statement);
      _debug(`${body.type} statement ${statement.type} completed`);
    }
    _debug(`completed ${body.type}, returning with: ${value}`);
    return value;
  }
  async loopBlock(stmt: ForOfStatement | ForInStatement | ForStatement | WhileStatement | DoWhileStatement) {
    const _debug = debug.extend(stmt.type);
    let statements = null;
    if (stmt.body.type === 'BlockStatement') {
      await this.interpreter.hoistFunctions(stmt.body.block);
      await this.interpreter.hoistVars(stmt.body.block);
      statements = stmt.body.block.statements.filter(stmt => stmt.type !== 'FunctionDeclaration');
    } else {
      statements = [stmt.body];
    }
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      _debug(`Evaluating ${statement.type} in ${stmt.type}`);
      await this.interpreter.evaluateNext(statement);
      _debug(`${stmt.type} statement ${statement.type} completed`);
      if (this.interpreter.isBreaking()) {
        break;
      }
      if (this.interpreter.isContinuing()) {
        break;
      }
    }
  }
  async ForOfStatement(stmt: ForOfStatement) {
    const iterationExpression = await this.interpreter.evaluateNext(stmt.right);
    function* nextValue() {
      yield* iterationExpression;
    }
    let iterator = nextValue();
    let result = null;

    while ((result = iterator.next())) {
      if (result.done) break;
      const {value} = result;
      switch (stmt.left.type) {
        case 'VariableDeclaration': {
          await this.interpreter.declareVariables(stmt.left);
          const binding = stmt.left.declarators[0].binding;
          if (binding.type === 'BindingIdentifier') this.interpreter.updateVariableValue(binding, value);
          else this.interpreter.skipOrThrow(stmt.type + '.left->' + binding.type);
          break;
        }
        default:
          this.interpreter.skipOrThrow(stmt.type + '.left->' + stmt.left.type);
      }
      await this.loopBlock(stmt);
      if (this.interpreter.isContinuing()) {
        this.interpreter.isContinuing(false);
        continue;
      }
      if (this.interpreter.isBreaking()) {
        this.interpreter.isBreaking(false);
        break;
      }
    }
  }

  async ForInStatement(stmt: ForInStatement) {
    const iterationExpression = await this.interpreter.evaluateNext(stmt.right);

    switch (stmt.left.type) {
      case 'VariableDeclaration': {
        await this.interpreter.declareVariables(stmt.left);
        const binding = stmt.left.declarators[0].binding;
        for (let a in iterationExpression) {
          if (binding.type === 'BindingIdentifier') this.interpreter.updateVariableValue(binding, a);
          else this.interpreter.skipOrThrow(stmt.type + '.left->' + binding.type);
          await this.loopBlock(stmt);
          if (this.interpreter.isContinuing()) {
            this.interpreter.isContinuing(false);
            continue;
          }
          if (this.interpreter.isBreaking()) {
            this.interpreter.isBreaking(false);
            break;
          }
        }
        break;
      }
      case 'AssignmentTargetIdentifier': {
        for (let a in iterationExpression) {
          this.interpreter.updateVariableValue(stmt.left, a);
          await this.loopBlock(stmt);
          if (this.interpreter.isContinuing()) {
            this.interpreter.isContinuing(false);
            continue;
          }
          if (this.interpreter.isBreaking()) {
            this.interpreter.isBreaking(false);
            break;
          }
        }
        break;
      }
      default:
        this.interpreter.skipOrThrow(stmt.type + '.left->' + stmt.left.type);
    }
  }

  async ForStatement(stmt: ForStatement) {
    if (stmt.init) {
      if (stmt.init.type === 'VariableDeclaration') await this.interpreter.declareVariables(stmt.init);
      else await this.interpreter.evaluateNext(stmt.init);
    }
    while (await this.interpreter.evaluateNext(stmt.test)) {
      await this.loopBlock(stmt);
      if (this.interpreter.isBreaking()) {
        this.interpreter.isBreaking(false);
        break;
      }
      if (stmt.update) await this.interpreter.evaluateNext(stmt.update);
      if (this.interpreter.isContinuing()) {
        this.interpreter.isContinuing(false);
        continue;
      }
    }
  }

  async WhileStatement(stmt: WhileStatement) {
    while (await this.interpreter.evaluateNext(stmt.test)) {
      await this.loopBlock(stmt);
      if (this.interpreter.isContinuing()) {
        this.interpreter.isContinuing(false);
        continue;
      }
      if (this.interpreter.isBreaking()) {
        this.interpreter.isBreaking(false);
        break;
      }
    }
  }

  async DoWhileStatement(stmt: DoWhileStatement) {
    do {
      await this.loopBlock(stmt);
      if (this.interpreter.isContinuing()) {
        this.interpreter.isContinuing(false);
        continue;
      }
      if (this.interpreter.isBreaking()) {
        this.interpreter.isBreaking(false);
        break;
      }
    } while (await this.interpreter.evaluateNext(stmt.test));
  }

  async ThisExpression(expr: ThisExpression) {
    return this.interpreter.getCurrentContext();
  }

  async NewExpression(expr: NewExpression) {
    const newTarget = await this.interpreter.evaluateNext(expr.callee);
    const args: any[] = [];
    for (let arg of expr.arguments) {
      if (arg.type === 'SpreadElement') {
        const value = await this.interpreter.evaluateNext(arg.expression);
        args.push(...value);
      } else {
        args.push(await this.interpreter.evaluateNext(arg));
      }
    }
    let result = new newTarget(...args);
    if (isIntermediaryFunction(newTarget)) {
      result = await result;
    }
    return result;
  }

  async ArrayExpression(expr: ArrayExpression) {
    const elements = [];
    for (let el of expr.elements) {
      if (el === null) {
        elements.push(null);
      } else if (el.type === 'SpreadElement') {
        const iterable = await this.interpreter.evaluateNext(el.expression);
        elements.push(...Array.from(iterable));
      } else {
        elements.push(await this.interpreter.evaluateNext(el));
      }
    }
    return elements;
  }

  async ObjectExpression(expr: ObjectExpression) {
    const _debug = debug.extend('ObjectExpression');
    const obj: {[key: string]: any} = {};
    const batchOperations: Map<string, Map<string, () => any>> = new Map();
    function getPropertyDescriptors(name: string) {
      if (batchOperations.has(name)) return batchOperations.get(name)!;
      const operations = new Map();
      batchOperations.set(name, operations);
      return operations;
    }
    for (let prop of expr.properties) {
      switch (prop.type) {
        case 'DataProperty': {
          const name =
            prop.name.type === 'StaticPropertyName'
              ? prop.name.value
              : await this.interpreter.evaluateNext(prop.name.expression);
          obj[name] = await this.interpreter.evaluateNext(prop.expression);
          break;
        }
        case 'Method': {
          const name =
            prop.name.type === 'StaticPropertyName'
              ? prop.name.value
              : await this.interpreter.evaluateNext(prop.name.expression);
          obj[name] = await this.interpreter.createFunction(prop);
          break;
        }
        case 'ShorthandProperty': {
          const name = prop.name.name;
          obj[name] = this.interpreter.getRuntimeValue(prop.name);
          break;
        }
        case 'Getter': {
          const name =
            prop.name.type === 'StaticPropertyName'
              ? prop.name.value
              : await this.interpreter.evaluateNext(prop.name.expression);
          const operations = getPropertyDescriptors(name);
          operations.set('get', await this.interpreter.createFunction(prop));
          break;
        }
        case 'Setter': {
          const name =
            prop.name.type === 'StaticPropertyName'
              ? prop.name.value
              : await this.interpreter.evaluateNext(prop.name.expression);
          const operations = getPropertyDescriptors(name);
          operations.set('set', await this.interpreter.createFunction(prop));
          break;
        }
        default:
          this.interpreter.skipOrThrow(`${expr.type}[${prop.type}]`);
      }
    }

    Array.from(batchOperations.entries()).forEach(([prop, ops]) => {
      _debug(`setting object property ${prop} (setter:${ops.has('set')}, getter:${ops.has('get')})`);
      const descriptor: PropertyDescriptor = {
        get: ops.get('get'),
        set: ops.get('set'),
        configurable: true,
      };
      Object.defineProperty(obj, prop, descriptor);
    });

    return obj;
  }

  async StaticMemberExpression(expr: StaticMemberExpression) {
    if (expr.object.type === 'Super') return this.interpreter.skipOrThrow(expr.object.type);
    const object = await this.interpreter.evaluateNext(expr.object);
    let result = object[expr.property];
    if (isGetterInternal(object, expr.property)) {
      result = await result;
    }
    return result;
  }

  async ComputedMemberExpression(expr: ComputedMemberExpression) {
    if (expr.object.type === 'Super') return this.interpreter.skipOrThrow(expr.object.type);
    const object = await this.interpreter.evaluateNext(expr.object);
    const property = await this.interpreter.evaluateNext(expr.expression);
    let result = object[property];
    if (isGetterInternal(object, property)) {
      result = await result;
    }
    return result;
  }

  async CallExpression(expr: CallExpression) {
    const _debug = debug.extend('CallExpression');
    if (expr.callee.type === 'Super') return this.interpreter.skipOrThrow(expr.callee.type);

    const args: any[] = [];
    for (let arg of expr.arguments) {
      if (arg.type === 'SpreadElement') {
        const value = await this.interpreter.evaluateNext(arg.expression);
        args.push(...value);
      } else {
        args.push(await this.interpreter.evaluateNext(arg));
      }
    }

    let context = this.interpreter.getCurrentContext();
    let fn = null;
    if (expr.callee.type === 'StaticMemberExpression') {
      context = await this.interpreter.evaluateNext(expr.callee.object);
      fn = context[expr.callee.property];
    } else if (expr.callee.type === 'ComputedMemberExpression') {
      context = await this.interpreter.evaluateNext(expr.callee.object);
      const computedProperty = await this.interpreter.evaluateNext(expr.callee.expression);
      fn = context[computedProperty];
    } else {
      fn = await this.interpreter.evaluateNext(expr.callee);
    }

    if (typeof fn === 'function') {
      let returnValue: any;
      let modifiedCall =
        (fn === Function.prototype.call || fn === Function.prototype.apply) && isIntermediaryFunction(context);
      if (fn._interp || modifiedCall) {
        // we have an interpreter-made function so the promise is ours.
        _debug(`calling interpreter function ${fn.name}`);
        returnValue = await fn.apply(context, args);
        _debug(`interpreter function completed ${fn.name}`);
      } else {
        _debug(`calling host function ${fn.name}`);
        returnValue = fn.apply(context, args);
        _debug(`host function completed ${fn.name}`);
      }
      return returnValue;
    } else {
      new TypeError(`${fn} is not a function (${this.interpreter.codegen(expr)})`);
    }
  }

  async AssignmentExpression(expr: AssignmentExpression) {
    const _debug = debug.extend('AssignmentExpression');
    switch (expr.binding.type) {
      case 'AssignmentTargetIdentifier':
        _debug(`assigning ${expr.binding.name} new value`);
        return this.interpreter.updateVariableValue(expr.binding, await this.interpreter.evaluateNext(expr.expression));
      case 'ComputedMemberAssignmentTarget': {
        const object = await this.interpreter.evaluateNext(expr.binding.object);
        const property = await this.interpreter.evaluateNext(expr.binding.expression);
        _debug(`evaluating expression ${expr.expression.type} to assign to ${toString(property)}`);
        const value = await this.interpreter.evaluateNext(expr.expression);
        _debug(`assigning object property "${toString(property)}" new value`);
        const descriptor = Object.getOwnPropertyDescriptor(object, property);
        let result = (object[property] = value);
        if (descriptor && isIntermediaryFunction(descriptor.set)) {
          result = await result;
        }
        return result;
      }
      case 'StaticMemberAssignmentTarget': {
        const object = await this.interpreter.evaluateNext(expr.binding.object);
        const property = expr.binding.property;
        _debug(`evaluating expression ${expr.expression.type} to assign to ${property}`);
        const value = await this.interpreter.evaluateNext(expr.expression);
        _debug(`assigning object property "${property}" new value`);
        const descriptor = Object.getOwnPropertyDescriptor(object, property);

        let result = null;
        if (descriptor && descriptor.set && isIntermediaryFunction(descriptor.set)) {
          result = await descriptor.set.call(object, value);
        } else {
          result = object[property] = value;
        }
        return result;
      }
      case 'ArrayAssignmentTarget':
      case 'ObjectAssignmentTarget':
      default:
        return this.interpreter.skipOrThrow(expr.binding.type);
    }
  }

  async UpdateExpression(expr: UpdateExpression) {
    switch (expr.operand.type) {
      case 'AssignmentTargetIdentifier': {
        const currentValue = this.interpreter.getRuntimeValue(expr.operand);
        const nextValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
        this.interpreter.updateVariableValue(expr.operand, nextValue);
        return expr.isPrefix ? nextValue : currentValue;
      }
      case 'ComputedMemberAssignmentTarget': {
        const object = await this.interpreter.evaluateNext(expr.operand.object);
        const property = await this.interpreter.evaluateNext(expr.operand.expression);
        const currentValue = object[property];
        const nextValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
        object[property] = nextValue;
        return expr.isPrefix ? nextValue : currentValue;
      }
      case 'StaticMemberAssignmentTarget': {
        const object = await this.interpreter.evaluateNext(expr.operand.object);
        const property = expr.operand.property;
        const currentValue = object[property];
        const nextValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
        object[property] = nextValue;
        return expr.isPrefix ? nextValue : currentValue;
      }
      default:
        return;
    }
  }

  async CompoundAssignmentExpression(expr: CompoundAssignmentExpression) {
    const operation = compoundAssignmentOperatorMap.get(expr.operator);
    switch (expr.binding.type) {
      case 'AssignmentTargetIdentifier': {
        const currentValue = this.interpreter.getRuntimeValue(expr.binding);
        const newValue = await this.interpreter.evaluateNext(expr.expression);
        return this.interpreter.updateVariableValue(expr.binding, operation(currentValue, newValue));
      }
      case 'ComputedMemberAssignmentTarget': {
        const object = await this.interpreter.evaluateNext(expr.binding.object);
        const property = await this.interpreter.evaluateNext(expr.binding.expression);
        const currentValue = object[property];
        const newValue = await this.interpreter.evaluateNext(expr.expression);
        const result = (object[property] = operation(currentValue, newValue));
        return result;
      }
      case 'StaticMemberAssignmentTarget': {
        const object = await this.interpreter.evaluateNext(expr.binding.object);
        const property = expr.binding.property;
        const currentValue = object[property];
        const newValue = await this.interpreter.evaluateNext(expr.expression);
        const result = (object[property] = operation(currentValue, newValue));
        return result;
      }
      default:
        return;
    }
  }

  async LiteralRegExpExpression(expr: LiteralRegExpExpression) {
    const flags = [
      expr.global ? 'g' : '',
      expr.ignoreCase ? 'i' : '',
      expr.dotAll ? 's' : '',
      expr.multiLine ? 'm' : '',
      expr.sticky ? 'y' : '',
      expr.unicode ? 'u' : '',
    ].filter(_ => !!_);
    return new RegExp(expr.pattern, ...flags);
  }

  async TemplateExpression(expr: TemplateExpression) {
    const parts = [];
    for (let el of expr.elements) {
      if (el.type === 'TemplateElement') {
        parts.push(el.rawValue);
      } else {
        parts.push(await this.interpreter.evaluateNext(el));
      }
    }
    return parts.join('');
  }

  async ArrowExpression(expr: ArrowExpression) {
    const interpreter = this.interpreter;
    const currentContext = interpreter.getCurrentContext();

    return function(this: BasicContext) {
      const arrowFn = async (...args: any) => {
        interpreter.pushContext(this);
        for (let i = 0; i < expr.params.items.length; i++) {
          let param = expr.params.items[i];
          await interpreter.bindVariable(param, args[i]);
        }
        let returnValue = undefined;
        if (expr.body.type === 'FunctionBody') {
          const blockResult = await interpreter.evaluateNext(expr.body);
          returnValue = blockResult;
        } else {
          returnValue = await interpreter.evaluateNext(expr.body);
        }
        interpreter.popContext();
        return returnValue;
      };
      Object.assign(arrowFn, {_interp: true});
      return arrowFn;
    }.bind(currentContext)();
  }
  async FunctionExpression(expr: FunctionExpression) {
    return this.interpreter.createFunction(expr);
  }
  async IdentifierExpression(expr: IdentifierExpression) {
    return this.interpreter.getRuntimeValue(expr);
  }
  async LiteralNumericExpression(expr: LiteralNumericExpression) {
    return expr.value;
  }
  async LiteralStringExpression(expr: LiteralStringExpression) {
    return expr.value;
  }
  async LiteralBooleanExpression(expr: LiteralBooleanExpression) {
    return expr.value;
  }
  async LiteralInfinityExpression(expr?: LiteralInfinityExpression) {
    return 1 / 0;
  }
  async LiteralNullExpression(expr?: LiteralNullExpression) {
    return null;
  }
  async BinaryExpression(expr: BinaryExpression) {
    const operation = binaryOperatorMap.get(expr.operator);
    const left = await this.interpreter.evaluateNext(expr.left);
    const deferredRight = async () => {
      return await this.interpreter.evaluateNext(expr.right);
    };
    return await operation(left, deferredRight);
  }
  async UnaryExpression(expr: UnaryExpression) {
    const operation = unaryOperatorMap.get(expr.operator);
    if (!operation) return this.interpreter.skipOrThrow(`${expr.type} : ${expr.operator}`);
    try {
      const operand = await this.interpreter.evaluateNext(expr.operand);
      return operation(operand);
    } catch (e) {
      if (e instanceof ReferenceError && expr.operator === 'typeof' && expr.operand.type === 'IdentifierExpression') {
        return 'undefined';
      }
      throw e;
    }
  }

  async BreakStatement(...args: any) {
    this.interpreter.isBreaking(true);
  }
  async ContinueStatement(...args: any) {
    this.interpreter.isContinuing(true);
  }
  async EmptyStatement(...args: any) {}

  // TODO support these nodes
  async WithStatement(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  async SwitchStatementWithDefault(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  async SwitchStatement(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  async LabeledStatement(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  async ForAwaitStatement(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  async DebuggerStatement(...args: any) {
    debugger;
  }
  async NewTargetExpression(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  async AwaitExpression(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  async Super(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  async ClassExpression(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  async YieldExpression(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  async YieldGeneratorExpression(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
}
