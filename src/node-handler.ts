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
import { createArrowFunction, createFunction } from './intermediate-types';
import { Identifier, Interpreter, ReturnValueWithState } from './interpreter';
import { binaryOperatorMap, compoundAssignmentOperatorMap, unaryOperatorMap } from './operators';
import { InterpreterRuntimeError } from './errors';

export class NodeHandler {
  interpreter: Interpreter;

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter;
  }

  ReturnStatement(stmt: ReturnStatement) {
    return new ReturnValueWithState(this.interpreter.evaluateExpression(stmt.expression), { didReturn: true });
  }

  ExpressionStatement(stmt: ExpressionStatement) {
    return this.interpreter.evaluateExpression(stmt.expression);
  }
  VariableDeclarationStatement(stmt: VariableDeclarationStatement) {
    return this.interpreter.declareVariables(stmt.declaration);
  }

  VariableDeclarator(declarator: VariableDeclarator) {
    return this.interpreter.bindVariable(declarator.binding, this.interpreter.evaluateExpression(declarator.init));
  }

  FunctionDeclaration(stmt: FunctionDeclaration) {
    return this.interpreter.declareFunction(stmt);
  }

  BlockStatement(stmt: BlockStatement) {
    return this.interpreter.evaluateBlock(stmt.block);
  }

  ClassDeclaration(stmt: ClassDeclaration) {
    return this.interpreter.declareClass(stmt);
  }

  IfStatement(stmt: IfStatement) {
    const test = this.interpreter.evaluateExpression(stmt.test);
    if (test) return this.interpreter.evaluateStatement(stmt.consequent);
    else if (stmt.alternate) return this.interpreter.evaluateStatement(stmt.alternate);
  }

  ConditionalExpression(stmt: ConditionalExpression) {
    const test = this.interpreter.evaluateExpression(stmt.test);
    if (test) return this.interpreter.evaluateExpression(stmt.consequent);
    else if (stmt.alternate) return this.interpreter.evaluateExpression(stmt.alternate);
  }

  ThrowStatement(stmt: ThrowStatement) {
    throw this.interpreter.evaluateExpression(stmt.expression);
  }

  TryCatchStatement(stmt: TryCatchStatement) {
    let returnValue = undefined;
    try {
      returnValue = this.interpreter.evaluateBlock(stmt.body);
      if (returnValue instanceof ReturnValueWithState) {
        if (returnValue.didReturn) return returnValue;
      }
    } catch (e) {
      this.interpreter.bindVariable(stmt.catchClause.binding, e);
      returnValue = this.interpreter.evaluateBlock(stmt.catchClause.body);
      if (returnValue instanceof ReturnValueWithState) {
        if (returnValue.didReturn) return returnValue;
      }
    }
    return returnValue;
  }

  TryFinallyStatement(stmt: TryFinallyStatement) {
    let returnValue = undefined;
    if (stmt.catchClause) {
      try {
        returnValue = this.interpreter.evaluateBlock(stmt.body);
        if (returnValue instanceof ReturnValueWithState) {
          if (returnValue.didReturn) return returnValue;
        }
      } catch (e) {
        this.interpreter.bindVariable(stmt.catchClause.binding, e);
        returnValue = this.interpreter.evaluateBlock(stmt.catchClause.body);
        if (returnValue instanceof ReturnValueWithState) {
          if (returnValue.didReturn) return returnValue;
        }
      } finally {
        returnValue = this.interpreter.evaluateBlock(stmt.finalizer);
        if (returnValue instanceof ReturnValueWithState) {
          if (returnValue.didReturn) return returnValue;
        }
      }
    } else {
      try {
        returnValue = this.interpreter.evaluateBlock(stmt.body);
        if (returnValue instanceof ReturnValueWithState) {
          if (returnValue.didReturn) return returnValue;
        }
      } finally {
        returnValue = this.interpreter.evaluateBlock(stmt.finalizer);
        if (returnValue instanceof ReturnValueWithState) {
          if (returnValue.didReturn) return returnValue;
        }
      }
    }
    return returnValue;
  }

  ForOfStatement(stmt: ForOfStatement) {
    this.interpreter.currentLoops.push(stmt);
    const iterationExpression = this.interpreter.evaluateExpression(stmt.right);
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
          this.interpreter.declareVariables(stmt.left);
          const binding = stmt.left.declarators[0].binding;
          if (binding.type === 'BindingIdentifier') this.interpreter.updateVariableValue(binding, value);
          else this.interpreter.skipOrThrow(stmt.type + '.left->' + binding.type);
          break;
        }
        default:
          this.interpreter.skipOrThrow(stmt.type + '.left->' + stmt.left.type);
      }
      this.interpreter.evaluateStatement(stmt.body);
    }
  }

  ForInStatement(stmt: ForInStatement) {
    this.interpreter.currentLoops.push(stmt);
    const iterationExpression = this.interpreter.evaluateExpression(stmt.right);

    switch (stmt.left.type) {
      case 'VariableDeclaration': {
        this.interpreter.declareVariables(stmt.left);
        const binding = stmt.left.declarators[0].binding;
        for (let a in iterationExpression) {
          if (binding.type === 'BindingIdentifier') this.interpreter.updateVariableValue(binding, a);
          else this.interpreter.skipOrThrow(stmt.type + '.left->' + binding.type);
          this.interpreter.evaluateStatement(stmt.body);
        }
        break;
      }
      default:
        this.interpreter.skipOrThrow(stmt.type + '.left->' + stmt.left.type);
    }
  }

  ForStatement(stmt: ForStatement) {
    this.interpreter.currentLoops.push(stmt);
    if (stmt.init) {
      if (stmt.init.type === 'VariableDeclaration') this.interpreter.declareVariables(stmt.init);
      else this.interpreter.evaluateExpression(stmt.init);
    }
    while (this.interpreter.evaluateExpression(stmt.test)) {
      if (stmt.body.type === 'BlockStatement') {
        const blockResult = this.interpreter.evaluateBlock(stmt.body.block);
        if (blockResult.didBreak) break;
      } else {
        this.interpreter.evaluateStatement(stmt.body);
      }
      if (stmt.update) this.interpreter.evaluateExpression(stmt.update);
    }
    this.interpreter.currentLoops.pop();
  }

  WhileStatement(stmt: WhileStatement) {
    this.interpreter.currentLoops.push(stmt);
    while (this.interpreter.evaluateExpression(stmt.test)) {
      if (stmt.body.type === 'BlockStatement') {
        const blockResult = this.interpreter.evaluateBlock(stmt.body.block);
        if (blockResult.didBreak) break;
      } else {
        this.interpreter.evaluateStatement(stmt.body);
      }
    }
    this.interpreter.currentLoops.pop();
  }

  DoWhileStatement(stmt: DoWhileStatement) {
    this.interpreter.currentLoops.push(stmt);
    do {
      if (stmt.body.type === 'BlockStatement') {
        const blockResult = this.interpreter.evaluateBlock(stmt.body.block);
        if (blockResult.didBreak) break;
      } else {
        this.interpreter.evaluateStatement(stmt.body);
      }
    } while (this.interpreter.evaluateExpression(stmt.test));
    this.interpreter.currentLoops.pop();
  }

  ThisExpression(expr: ThisExpression) {
    return this.interpreter.getCurrentContext();
  }

  NewExpression(expr: NewExpression) {
    const ClassTarget = this.interpreter.evaluateExpression(expr.callee);
    const args: any[] = [];
    expr.arguments.forEach(_ => {
      if (_.type === 'SpreadElement') {
        const value = this.interpreter.evaluateExpression(_.expression);
        args.push(...value);
      } else {
        args.push(this.interpreter.evaluateExpression(_));
      }
    });

    return new ClassTarget(...args);
  }

  ArrayExpression(expr: ArrayExpression) {
    return expr.elements.flatMap(el => {
      if (el === null) {
        return [null];
      } else if (el.type === 'SpreadElement') {
        const iterable = this.interpreter.evaluateExpression(el.expression);
        return Array.from(iterable);
      } else {
        return [this.interpreter.evaluateExpression(el)];
      }
    });
  }

  ObjectExpression(expr: ObjectExpression) {
    const obj: { [key: string]: any } = {};
    const batchOperations: Map<string, Map<string, () => any>> = new Map();
    function getPropertyDescriptors(name: string) {
      if (batchOperations.has(name)) return batchOperations.get(name)!;
      const operations = new Map();
      batchOperations.set(name, operations);
      return operations;
    }
    expr.properties.forEach(prop => {
      switch (prop.type) {
        case 'DataProperty': {
          const name =
            prop.name.type === 'StaticPropertyName'
              ? prop.name.value
              : this.interpreter.evaluateExpression(prop.name.expression);
          obj[name] = this.interpreter.evaluateExpression(prop.expression);
          break;
        }
        case 'Method': {
          const name =
            prop.name.type === 'StaticPropertyName'
              ? prop.name.value
              : this.interpreter.evaluateExpression(prop.name.expression);
          obj[name] = createFunction(prop, this.interpreter);
          break;
        }
        case 'ShorthandProperty': {
          const name = prop.name.name;
          const value = this.interpreter.getVariableValue(prop.name);
          obj[name] = value;
          break;
        }
        case 'Getter': {
          const name =
            prop.name.type === 'StaticPropertyName'
              ? prop.name.value
              : this.interpreter.evaluateExpression(prop.name.expression);
          const operations = getPropertyDescriptors(name);
          operations.set('get', createFunction(prop, this.interpreter));
          break;
        }
        case 'Setter': {
          const name =
            prop.name.type === 'StaticPropertyName'
              ? prop.name.value
              : this.interpreter.evaluateExpression(prop.name.expression);
          const operations = getPropertyDescriptors(name);
          operations.set('set', createFunction(prop, this.interpreter));
          break;
        }
        default:
          this.interpreter.skipOrThrow(`${expr.type}[${prop.type}]`);
      }
    });

    Array.from(batchOperations.entries()).forEach(([prop, ops]) => {
      const descriptor: PropertyDescriptor = {
        get: ops.get('get'),
        set: ops.get('set'),
        configurable: true,
      };
      Object.defineProperty(obj, prop, descriptor);
    });

    return obj;
  }

  StaticMemberExpression(expr: StaticMemberExpression) {
    if (expr.object.type === 'Super') return this.interpreter.skipOrThrow(expr.object.type);
    const object = this.interpreter.evaluateExpression(expr.object);
    const value = object[expr.property];
    return value;
  }

  ComputedMemberExpression(expr: ComputedMemberExpression) {
    if (expr.object.type === 'Super') return this.interpreter.skipOrThrow(expr.object.type);
    const object = this.interpreter.evaluateExpression(expr.object);
    const value = object[this.interpreter.evaluateExpression(expr.expression)];
    // if (typeof value === "function") return value.bind(object);
    return value;
  }

  CallExpression(expr: CallExpression) {
    if (expr.callee.type === 'Super') return this.interpreter.skipOrThrow(expr.callee.type);

    const args: any[] = [];
    expr.arguments.forEach(_ => {
      if (_.type === 'SpreadElement') {
        const value = this.interpreter.evaluateExpression(_.expression);
        args.push(...value);
      } else {
        args.push(this.interpreter.evaluateExpression(_));
      }
    });

    let context = this.interpreter.getCurrentContext();
    let fn = null;
    if (expr.callee.type === 'StaticMemberExpression') {
      context = this.interpreter.evaluateExpression(expr.callee.object);
      fn = context[expr.callee.property];
    } else if (expr.callee.type === 'ComputedMemberExpression') {
      context = this.interpreter.evaluateExpression(expr.callee.object);
      fn = context[this.interpreter.evaluateExpression(expr.callee.expression)];
    } else {
      fn = this.interpreter.evaluateExpression(expr.callee);
    }

    if (typeof fn === 'function') {
      return fn.apply(context, args);
    } else {
      throw new Error(`Can not execute non-function ${JSON.stringify(expr)}`);
    }
  }

  AssignmentExpression(expr: AssignmentExpression) {
    switch (expr.binding.type) {
      case 'AssignmentTargetIdentifier':
        return this.interpreter.updateVariableValue(expr.binding, this.interpreter.evaluateExpression(expr.expression));
      case 'ComputedMemberAssignmentTarget': {
        const object = this.interpreter.evaluateExpression(expr.binding.object);
        const property = this.interpreter.evaluateExpression(expr.binding.expression);
        const value = this.interpreter.evaluateExpression(expr.expression);
        return (object[property] = value);
      }
      case 'StaticMemberAssignmentTarget': {
        const object = this.interpreter.evaluateExpression(expr.binding.object);
        const property = expr.binding.property;
        const value = this.interpreter.evaluateExpression(expr.expression);
        return (object[property] = value);
      }
      case 'ArrayAssignmentTarget':
      case 'ObjectAssignmentTarget':
      default:
        return this.interpreter.skipOrThrow(expr.binding.type);
    }
  }

  UpdateExpression(expr: UpdateExpression) {
    switch (expr.operand.type) {
      case 'AssignmentTargetIdentifier': {
        const currentValue = this.interpreter.getVariableValue(expr.operand);
        const nextValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
        // I don't know why I need to cast this. It's fine 2 lines above. VSCode bug?
        this.interpreter.updateVariableValue(expr.operand as Identifier, nextValue);
        return expr.isPrefix ? nextValue : currentValue;
      }
      case 'ComputedMemberAssignmentTarget': {
        const object = this.interpreter.evaluateExpression(expr.operand.object);
        const property = this.interpreter.evaluateExpression(expr.operand.expression);
        const currentValue = object[property];
        const nextValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
        object[property] = nextValue;
        return expr.isPrefix ? nextValue : currentValue;
      }
      case 'StaticMemberAssignmentTarget': {
        const object = this.interpreter.evaluateExpression(expr.operand.object);
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

  CompoundAssignmentExpression(expr: CompoundAssignmentExpression) {
    const operation = compoundAssignmentOperatorMap.get(expr.operator);
    switch (expr.binding.type) {
      case 'AssignmentTargetIdentifier': {
        const currentValue = this.interpreter.getVariableValue(expr.binding);
        return this.interpreter.updateVariableValue(
          expr.binding,
          operation(currentValue, this.interpreter.evaluateExpression(expr.expression)),
        );
      }
      case 'ComputedMemberAssignmentTarget': {
        const object = this.interpreter.evaluateExpression(expr.binding.object);
        const property = this.interpreter.evaluateExpression(expr.binding.expression);
        const currentValue = object[property];
        return (object[property] = operation(currentValue, this.interpreter.evaluateExpression(expr.expression)));
      }
      case 'StaticMemberAssignmentTarget': {
        const object = this.interpreter.evaluateExpression(expr.binding.object);
        const property = expr.binding.property;
        const currentValue = object[property];
        return (object[property] = operation(currentValue, this.interpreter.evaluateExpression(expr.expression)));
      }
      default:
        return;
    }
  }

  LiteralRegExpExpression(expr: LiteralRegExpExpression) {
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

  TemplateExpression(expr: TemplateExpression) {
    return expr.elements
      .map(el => {
        if (el.type === 'TemplateElement') {
          return el.rawValue;
        } else {
          return this.interpreter.evaluateExpression(el);
        }
      })
      .join('');
  }

  ArrowExpression(expr: ArrowExpression) {
    return createArrowFunction(expr, this.interpreter.getCurrentContext(), this.interpreter);
  }
  FunctionExpression(expr: FunctionExpression) {
    return createFunction(expr, this.interpreter);
  }
  IdentifierExpression(expr: IdentifierExpression) {
    return this.interpreter.getVariableValue(expr);
  }
  LiteralNumericExpression(expr: LiteralNumericExpression) {
    return expr.value;
  }
  LiteralStringExpression(expr: LiteralStringExpression) {
    return expr.value;
  }
  LiteralBooleanExpression(expr: LiteralBooleanExpression) {
    return expr.value;
  }
  LiteralInfinityExpression(expr?: LiteralInfinityExpression) {
    return 1 / 0;
  }
  LiteralNullExpression(expr?: LiteralNullExpression) {
    return null;
  }
  BinaryExpression(expr: BinaryExpression) {
    const operation = binaryOperatorMap.get(expr.operator);
    return operation!(this.interpreter.evaluateExpression(expr.left), this.interpreter.evaluateExpression(expr.right));
  }
  UnaryExpression(expr: UnaryExpression) {
    const operation = unaryOperatorMap.get(expr.operator);
    if (!operation) return this.interpreter.skipOrThrow(`${expr.type} : ${expr.operator}`);
    return operation!(this.interpreter.evaluateExpression(expr.operand));
  }

  // TODO move any possible logic here.
  BreakStatement(...args: any) {
  }
  ContinueStatement(...args: any) {
  }
  EmptyStatement(...args: any) {
  }

  // TODO support these nodes
  WithStatement(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  SwitchStatementWithDefault(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  SwitchStatement(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  LabeledStatement(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  ForAwaitStatement(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  DebuggerStatement(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  NewTargetExpression(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  AwaitExpression(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  Super(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  ClassExpression(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  YieldExpression(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
  YieldGeneratorExpression(...args: any) {
    throw new InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
  }
}
