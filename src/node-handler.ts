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
} from 'shift-ast';
import { InterpreterRuntimeError } from './errors';
import { Interpreter } from './interpreter';
import { binaryOperatorMap, compoundAssignmentOperatorMap, unaryOperatorMap } from './operators';
import { InterpreterContext } from './context';
import DEBUG from 'debug';
import { RuntimeValue } from './runtime-value';
import { isIntermediaryFunction, isGetterInternal } from './util';

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
    return new RuntimeValue(value.unwrap(), { didReturn: true });
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
    const variables = this.interpreter.scopeLookup.get(decl.name);

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
      const xtends = RuntimeValue.unwrap(await this.interpreter.evaluateNext(decl.super));
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

    const variables = this.interpreter.scopeLookup.get(decl.name);

    variables.forEach((variable: any) => this.interpreter.variableMap.set(variable, Class));

    return Class;
  }

  async IfStatement(stmt: IfStatement) {
    const test = await this.interpreter.evaluateNext(stmt.test);
    if (test.unwrap()) return this.interpreter.evaluateNext(stmt.consequent);
    else if (stmt.alternate) return this.interpreter.evaluateNext(stmt.alternate);
  }

  async ConditionalExpression(stmt: ConditionalExpression) {
    const test = await this.interpreter.evaluateNext(stmt.test);
    if (test.unwrap()) return this.interpreter.evaluateNext(stmt.consequent);
    else if (stmt.alternate) return this.interpreter.evaluateNext(stmt.alternate);
  }

  async ThrowStatement(stmt: ThrowStatement) {
    const error = await this.interpreter.evaluateNext(stmt.expression);
    throw error.unwrap();
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

  async ForOfStatement(stmt: ForOfStatement) {
    this.interpreter.currentLoops.push(stmt);
    const iterationExpression = (await this.interpreter.evaluateNext(stmt.right)).unwrap();
    function* nextValue() {
      yield* iterationExpression;
    }
    let iterator = nextValue();
    let result = null;

    while ((result = iterator.next())) {
      if (result.done) break;
      const { value } = result;
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
      await this.interpreter.evaluateNext(stmt.body);
    }
  }

  async ForInStatement(stmt: ForInStatement) {
    this.interpreter.currentLoops.push(stmt);
    const iterationExpression = await this.interpreter.evaluateNext(stmt.right);

    switch (stmt.left.type) {
      case 'VariableDeclaration': {
        await this.interpreter.declareVariables(stmt.left);
        const binding = stmt.left.declarators[0].binding;
        for (let a in iterationExpression.unwrap()) {
          if (binding.type === 'BindingIdentifier') this.interpreter.updateVariableValue(binding, a);
          else this.interpreter.skipOrThrow(stmt.type + '.left->' + binding.type);
          await this.interpreter.evaluateNext(stmt.body);
        }
        break;
      }
      default:
        this.interpreter.skipOrThrow(stmt.type + '.left->' + stmt.left.type);
    }
  }

  async ForStatement(stmt: ForStatement) {
    this.interpreter.currentLoops.push(stmt);
    if (stmt.init) {
      if (stmt.init.type === 'VariableDeclaration') await this.interpreter.declareVariables(stmt.init);
      else await this.interpreter.evaluateNext(stmt.init);
    }
    while (RuntimeValue.unwrap(await this.interpreter.evaluateNext(stmt.test))) {
      if (stmt.body.type === 'BlockStatement') {
        const blockResult = await this.interpreter.evaluateNext(stmt.body.block);
        if (blockResult.didBreak) break;
      } else {
        await this.interpreter.evaluateNext(stmt.body);
      }
      if (stmt.update) await this.interpreter.evaluateNext(stmt.update);
    }
    this.interpreter.currentLoops.pop();
  }

  async WhileStatement(stmt: WhileStatement) {
    this.interpreter.currentLoops.push(stmt);
    while ((await this.interpreter.evaluateNext(stmt.test)).unwrap()) {
      if (stmt.body.type === 'BlockStatement') {
        const blockResult = await this.interpreter.evaluateNext(stmt.body.block);
        if (blockResult.didBreak) break;
      } else {
        await this.interpreter.evaluateNext(stmt.body);
      }
    }
    this.interpreter.currentLoops.pop();
  }

  async DoWhileStatement(stmt: DoWhileStatement) {
    this.interpreter.currentLoops.push(stmt);
    do {
      if (stmt.body.type === 'BlockStatement') {
        const blockResult = await this.interpreter.evaluateNext(stmt.body.block);
        if (blockResult.didBreak) break;
      } else {
        await this.interpreter.evaluateNext(stmt.body);
      }
    } while ((await this.interpreter.evaluateNext(stmt.test)).unwrap());
    this.interpreter.currentLoops.pop();
  }

  async ThisExpression(expr: ThisExpression) {
    return this.interpreter.getCurrentContext();
  }

  async NewExpression(expr: NewExpression) {
    const ClassTarget = (await this.interpreter.evaluateNext(expr.callee)).unwrap();
    const args: any[] = [];
    for (let arg of expr.arguments) {
      if (arg.type === 'SpreadElement') {
        const value = (await this.interpreter.evaluateNext(arg.expression)).unwrap();
        args.push(...value);
      } else {
        args.push((await this.interpreter.evaluateNext(arg)).unwrap());
      }
    }

    this.interpreter.currentNode = expr;
    return new ClassTarget(...args);
  }

  async ArrayExpression(expr: ArrayExpression) {
    const elements = [];
    for (let el of expr.elements) {
      if (el === null) {
        elements.push(null);
      } else if (el.type === 'SpreadElement') {
        const iterable = (await this.interpreter.evaluateNext(el.expression)).unwrap();
        elements.push(...Array.from(iterable));
      } else {
        elements.push(await this.interpreter.evaluateNext(el));
      }
    }
    return elements;
  }

  async ObjectExpression(expr: ObjectExpression) {
    const _debug = debug.extend('ObjectExpression');
    const obj: { [key: string]: any } = {};
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
              : (await this.interpreter.evaluateNext(prop.name.expression)).unwrap();
          obj[name] = (await this.interpreter.evaluateNext(prop.expression)).unwrap();
          break;
        }
        case 'Method': {
          const name =
            prop.name.type === 'StaticPropertyName'
              ? prop.name.value
              : (await this.interpreter.evaluateNext(prop.name.expression)).unwrap();
          obj[name] = await this.interpreter.createFunction(prop);
          break;
        }
        case 'ShorthandProperty': {
          const name = prop.name.name;
          obj[name] = this.interpreter.getRuntimeValue(prop.name).unwrap();
          break;
        }
        case 'Getter': {
          const name =
            prop.name.type === 'StaticPropertyName'
              ? prop.name.value
              : (await this.interpreter.evaluateNext(prop.name.expression)).unwrap();
          const operations = getPropertyDescriptors(name);
          operations.set('get', await this.interpreter.createFunction(prop));
          break;
        }
        case 'Setter': {
          const name =
            prop.name.type === 'StaticPropertyName'
              ? prop.name.value
              : (await this.interpreter.evaluateNext(prop.name.expression)).unwrap();
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
    const object = RuntimeValue.unwrap(await this.interpreter.evaluateNext(expr.object));
    let result = object[expr.property];
    if (isGetterInternal(object, expr.property)) {
      result = await result;
    }
    return RuntimeValue.wrap(result);
  }

  async ComputedMemberExpression(expr: ComputedMemberExpression) {
    if (expr.object.type === 'Super') return this.interpreter.skipOrThrow(expr.object.type);
    const object = RuntimeValue.unwrap(await this.interpreter.evaluateNext(expr.object));
    const property = RuntimeValue.unwrap(await this.interpreter.evaluateNext(expr.expression));
    let result = object[property];
    if (isGetterInternal(object, property)) {
      result = await result;
    }
    return RuntimeValue.wrap(result);
  }

  async CallExpression(expr: CallExpression) {
    const _debug = debug.extend('CallExpression');
    if (expr.callee.type === 'Super') return this.interpreter.skipOrThrow(expr.callee.type);

    const args: any[] = [];
    for (let arg of expr.arguments) {
      if (arg.type === 'SpreadElement') {
        const value = await this.interpreter.evaluateNext(arg.expression);
        args.push(...value.unwrap());
      } else {
        args.push(RuntimeValue.unwrap(await this.interpreter.evaluateNext(arg)));
      }
    }

    let context = this.interpreter.getCurrentContext();
    let fn = null;
    if (expr.callee.type === 'StaticMemberExpression') {
      context = RuntimeValue.unwrap(await this.interpreter.evaluateNext(expr.callee.object));
      fn = RuntimeValue.unwrap(context[expr.callee.property]);
    } else if (expr.callee.type === 'ComputedMemberExpression') {
      context = RuntimeValue.unwrap(await this.interpreter.evaluateNext(expr.callee.object));
      const computedProperty = await this.interpreter.evaluateNext(expr.callee.expression);
      fn = RuntimeValue.unwrap(context[computedProperty.unwrap()]);
    } else {
      fn = RuntimeValue.unwrap(await this.interpreter.evaluateNext(expr.callee));
    }

    if (typeof fn === 'function') {
      let returnValue: RuntimeValue<any>;
      if (fn._interp) {
        // we have an interpreter-made function so the promise is ours.
        _debug('calling interpreter function');
        returnValue = await fn.apply(context, args);
        _debug('interpreter function completed');
      } else {
        _debug('calling host function');
        returnValue = fn.apply(context, args);
        _debug('host function completed');
      }
      return RuntimeValue.wrap(returnValue);
    } else {
      throw new Error(`Can not execute non-function ${JSON.stringify(expr)}`);
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
        _debug(`evaluating expression ${expr.expression.type} to assign to ${property}`);
        const value = await this.interpreter.evaluateNext(expr.expression);
        _debug(`assigning object property "${property}" new value`);
        const result = (object.unwrap()[property.unwrap()] = value);
        return result;
      }
      case 'StaticMemberAssignmentTarget': {
        const object = await this.interpreter.evaluateNext(expr.binding.object);
        const property = expr.binding.property;
        _debug(`evaluating expression ${expr.expression.type} to assign to ${property}`);
        const value = await this.interpreter.evaluateNext(expr.expression);
        _debug(`assigning object property "${property}" new value`);
        const result = (object.unwrap()[property] = value);
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
        const currentValue = this.interpreter.getRuntimeValue(expr.operand).unwrap();
        const nextValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
        this.interpreter.updateVariableValue(expr.operand, nextValue);
        return expr.isPrefix ? nextValue : currentValue;
      }
      case 'ComputedMemberAssignmentTarget': {
        const object = await this.interpreter.evaluateNext(expr.operand.object);
        const property = await this.interpreter.evaluateNext(expr.operand.expression);
        const currentValue = object.unwrap()[property.unwrap()];
        const nextValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
        object.unwrap()[property.unwrap()] = nextValue;
        return expr.isPrefix ? nextValue : currentValue;
      }
      case 'StaticMemberAssignmentTarget': {
        const object = await this.interpreter.evaluateNext(expr.operand.object);
        const property = expr.operand.property;
        const currentValue = object.unwrap()[property];
        const nextValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
        object.unwrap()[property] = nextValue;
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
        const currentValue = this.interpreter.getRuntimeValue(expr.binding).unwrap();
        const newValue = await this.interpreter.evaluateNext(expr.expression);
        return this.interpreter.updateVariableValue(expr.binding, operation(currentValue, newValue.unwrap()));
      }
      case 'ComputedMemberAssignmentTarget': {
        const object = (await this.interpreter.evaluateNext(expr.binding.object)).unwrap();
        const property = (await this.interpreter.evaluateNext(expr.binding.expression)).unwrap();
        const currentValue = object[property];
        const newValue = await this.interpreter.evaluateNext(expr.expression);
        const result = (object[property] = operation(currentValue, newValue.unwrap()));
        return result;
      }
      case 'StaticMemberAssignmentTarget': {
        const object = (await this.interpreter.evaluateNext(expr.binding.object)).unwrap();
        const property = expr.binding.property;
        const currentValue = object[property];
        const newValue = await this.interpreter.evaluateNext(expr.expression);
        const result = (object[property] = operation(currentValue, newValue.unwrap()));
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
        parts.push(RuntimeValue.unwrap(await this.interpreter.evaluateNext(el)));
      }
    }
    return parts.join('');
  }

  async ArrowExpression(expr: ArrowExpression) {
    const interpreter = this.interpreter;

    return function(this: InterpreterContext) {
      const arrowFn = async (...args: any) => {
        interpreter.pushContext(this);
        for (let i = 0; i < expr.params.items.length; i++) {
          let param = expr.params.items[i];
          await interpreter.bindVariable(param, args[i]);
        }
        let returnValue = undefined;
        if (expr.body.type === 'FunctionBody') {
          const blockResult = await interpreter.evaluateNext(expr.body);
          returnValue = blockResult.value;
        } else {
          returnValue = await interpreter.evaluateNext(expr.body);
        }
        interpreter.popContext();
        return returnValue;
      };
      Object.assign(arrowFn, { _interp: true });
      return arrowFn;
    }.bind(interpreter.getCurrentContext())();
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
    const right = await this.interpreter.evaluateNext(expr.right);
    return operation(left.unwrap(), right.unwrap());
  }
  async UnaryExpression(expr: UnaryExpression) {
    const operation = unaryOperatorMap.get(expr.operator);
    if (!operation) return this.interpreter.skipOrThrow(`${expr.type} : ${expr.operator}`);
    const operand = await this.interpreter.evaluateNext(expr.operand);
    return operation(operand.unwrap());
  }

  // TODO move any possible logic here.
  async BreakStatement(...args: any) {}
  async ContinueStatement(...args: any) {}
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
