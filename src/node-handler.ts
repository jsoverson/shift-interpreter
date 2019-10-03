import {
  BlockStatement,
  ClassDeclaration,
  Expression,
  ExpressionStatement,
  FunctionDeclaration,
  IfStatement,
  ReturnStatement,
  VariableDeclarationStatement,
  BreakStatement,
  ContinueStatement,
  ForOfStatement,
  ForInStatement,
  Script,
  Statement,
  ForStatement,
  WhileStatement,
  DoWhileStatement,
  EmptyStatement,
  ThisExpression,
  NewExpression,
  ArrayExpression,
  ObjectExpression,
  StaticMemberExpression,
  ComputedMemberExpression,
  CallExpression,
  AssignmentExpression,
  UpdateExpression,
  CompoundAssignmentExpression,
  LiteralRegExpExpression,
  TemplateExpression,
  UnaryExpression,
  ArrowExpression,
  FunctionExpression,
  IdentifierExpression,
  LiteralStringExpression,
  LiteralNumericExpression,
  LiteralInfinityExpression,
  LiteralNullExpression,
  BinaryExpression,
  LiteralBooleanExpression,
} from 'shift-ast';
import {Interpreter, Identifier} from './interpreter';
import {createFunction, createArrowFunction} from './intermediate-types';
import {compoundAssignmentOperatorMap, unaryOperatorMap, binaryOperatorMap} from './operators';

type ShiftNode = typeof Script | ForInStatement | Statement | Expression;

type NodeHandler = Map<string | ShiftNode, Function>;

export const nodeHandler: NodeHandler = new Map();

function evaluateChildExpression(interpreter: Interpreter, stmt: {expression: Expression}) {
  return interpreter.evaluateExpression(stmt.expression);
}

function getLiteralValue(interpreter: Interpreter, expr: {value: any}) {
  return expr.value;
}

nodeHandler.set(ReturnStatement.name, evaluateChildExpression);
nodeHandler.set(ExpressionStatement.name, evaluateChildExpression);

nodeHandler.set(VariableDeclarationStatement.name, (i: Interpreter, stmt: VariableDeclarationStatement) =>
  i.declareVariables(stmt.declaration),
);

nodeHandler.set(FunctionDeclaration.name, (i: Interpreter, stmt: FunctionDeclaration) => i.declareFunction(stmt));

nodeHandler.set(BlockStatement.name, (i: Interpreter, stmt: BlockStatement) => i.evaluateBlock(stmt.block).returnValue);

nodeHandler.set(ClassDeclaration.name, (i: Interpreter, stmt: ClassDeclaration) => i.declareClass(stmt));

nodeHandler.set(IfStatement.name, (i: Interpreter, stmt: IfStatement) => {
  const test = i.evaluateExpression(stmt.test);
  if (test) return i.evaluateStatement(stmt.consequent);
  else if (stmt.alternate) return i.evaluateStatement(stmt.alternate);
});

nodeHandler.set(BreakStatement.name, () => {});
nodeHandler.set(ContinueStatement.name, () => {});
nodeHandler.set(EmptyStatement.name, () => {});

nodeHandler.set(ForOfStatement.name, (i: Interpreter, stmt: ForOfStatement) => {
  i.currentLoops.push(stmt);
  const iterationExpression = i.evaluateExpression(stmt.right);
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
        i.declareVariables(stmt.left);
        const binding = stmt.left.declarators[0].binding;
        if (binding.type === 'BindingIdentifier') i.updateVariableValue(binding, value);
        else i.skipOrThrow(stmt.type + '.left->' + binding.type);
        break;
      }
      default:
        i.skipOrThrow(stmt.type + '.left->' + stmt.left.type);
    }
    i.evaluateStatement(stmt.body);
  }
});

nodeHandler.set(ForInStatement.name, (i: Interpreter, stmt: ForInStatement) => {
  i.currentLoops.push(stmt);
  const iterationExpression = i.evaluateExpression(stmt.right);

  switch (stmt.left.type) {
    case 'VariableDeclaration': {
      i.declareVariables(stmt.left);
      const binding = stmt.left.declarators[0].binding;
      for (let a in iterationExpression) {
        if (binding.type === 'BindingIdentifier') i.updateVariableValue(binding, a);
        else i.skipOrThrow(stmt.type + '.left->' + binding.type);
        i.evaluateStatement(stmt.body);
      }
      break;
    }
    default:
      i.skipOrThrow(stmt.type + '.left->' + stmt.left.type);
  }
});

nodeHandler.set(ForStatement.name, (i: Interpreter, stmt: ForStatement) => {
  i.currentLoops.push(stmt);
  if (stmt.init) {
    if (stmt.init.type === 'VariableDeclaration') i.declareVariables(stmt.init);
    else i.evaluateExpression(stmt.init);
  }
  while (i.evaluateExpression(stmt.test)) {
    if (stmt.body.type === 'BlockStatement') {
      const blockResult = i.evaluateBlock(stmt.body.block);
      if (blockResult.didBreak) break;
    } else {
      i.evaluateStatement(stmt.body);
    }
    if (stmt.update) i.evaluateExpression(stmt.update);
  }
  i.currentLoops.pop();
});

nodeHandler.set(WhileStatement.name, (i: Interpreter, stmt: WhileStatement) => {
  i.currentLoops.push(stmt);
  while (i.evaluateExpression(stmt.test)) {
    if (stmt.body.type === 'BlockStatement') {
      const blockResult = i.evaluateBlock(stmt.body.block);
      if (blockResult.didBreak) break;
    } else {
      i.evaluateStatement(stmt.body);
    }
  }
  i.currentLoops.pop();
});

nodeHandler.set(DoWhileStatement.name, (i: Interpreter, stmt: DoWhileStatement) => {
  i.currentLoops.push(stmt);
  do {
    if (stmt.body.type === 'BlockStatement') {
      const blockResult = i.evaluateBlock(stmt.body.block);
      if (blockResult.didBreak) break;
    } else {
      i.evaluateStatement(stmt.body);
    }
  } while (i.evaluateExpression(stmt.test));
  i.currentLoops.pop();
});

nodeHandler.set(ThisExpression.name, (i: Interpreter, expr: ThisExpression) => i.getCurrentContext());

nodeHandler.set(NewExpression.name, (i: Interpreter, expr: NewExpression) => {
  const ClassTarget = i.evaluateExpression(expr.callee);
  const args: any[] = [];
  expr.arguments.forEach(_ => {
    if (_.type === 'SpreadElement') {
      const value = i.evaluateExpression(_.expression);
      args.push(...value);
    } else {
      args.push(i.evaluateExpression(_));
    }
  });

  return new ClassTarget(...args);
});

nodeHandler.set(ArrayExpression.name, (i: Interpreter, expr: ArrayExpression) => {
  return expr.elements.flatMap(el => {
    if (el === null) {
      return [null];
    } else if (el.type === 'SpreadElement') {
      const iterable = i.evaluateExpression(el.expression);
      return Array.from(iterable);
    } else {
      return [i.evaluateExpression(el)];
    }
  });
});

nodeHandler.set(ObjectExpression.name, (i: Interpreter, expr: ObjectExpression) => {
  const entries = expr.properties.map(prop => {
    switch (prop.type) {
      case 'DataProperty': {
        const name =
          prop.name.type === 'StaticPropertyName' ? prop.name.value : i.evaluateExpression(prop.name.expression);
        return [name, i.evaluateExpression(prop.expression)];
      }
      case 'Method': {
        const name =
          prop.name.type === 'StaticPropertyName' ? prop.name.value : i.evaluateExpression(prop.name.expression);
        return [name, createFunction(prop, i)];
      }
      case 'ShorthandProperty': {
        const name = prop.name.name;
        const value = i.getVariableValue(prop.name);
        return [name, value];
      }
      default:
        i.skipOrThrow(`${expr.type}[${prop.type}]`);
        return [];
    }
  });
  return Object.fromEntries(entries);
});

nodeHandler.set(StaticMemberExpression.name, (i: Interpreter, expr: StaticMemberExpression) => {
  if (expr.object.type === 'Super') return i.skipOrThrow(expr.object.type);
  const object = i.evaluateExpression(expr.object);
  const value = object[expr.property];
  return value;
});

nodeHandler.set(ComputedMemberExpression.name, (i: Interpreter, expr: ComputedMemberExpression) => {
  if (expr.object.type === 'Super') return i.skipOrThrow(expr.object.type);
  const object = i.evaluateExpression(expr.object);
  const value = object[i.evaluateExpression(expr.expression)];
  // if (typeof value === "function") return value.bind(object);
  return value;
});

nodeHandler.set(CallExpression.name, (i: Interpreter, expr: CallExpression) => {
  if (expr.callee.type === 'Super') return i.skipOrThrow(expr.callee.type);

  const args: any[] = [];
  expr.arguments.forEach(_ => {
    if (_.type === 'SpreadElement') {
      const value = i.evaluateExpression(_.expression);
      args.push(...value);
    } else {
      args.push(i.evaluateExpression(_));
    }
  });

  let context = i.getCurrentContext();
  let fn = null;
  if (expr.callee.type === 'StaticMemberExpression') {
    context = i.evaluateExpression(expr.callee.object);
    fn = context[expr.callee.property];
  } else if (expr.callee.type === 'ComputedMemberExpression') {
    context = i.evaluateExpression(expr.callee.object);
    fn = context[i.evaluateExpression(expr.callee.expression)];
  } else {
    fn = i.evaluateExpression(expr.callee);
  }

  if (typeof fn === 'function') {
    return fn.apply(context, args);
  } else {
    throw new Error(`Can not execute non-function ${JSON.stringify(expr)}`);
  }
});

nodeHandler.set(AssignmentExpression.name, (i: Interpreter, expr: AssignmentExpression) => {
  switch (expr.binding.type) {
    case 'AssignmentTargetIdentifier':
      return i.updateVariableValue(expr.binding, i.evaluateExpression(expr.expression));
    case 'ComputedMemberAssignmentTarget': {
      const object = i.evaluateExpression(expr.binding.object);
      const property = i.evaluateExpression(expr.binding.expression);
      const value = i.evaluateExpression(expr.expression);
      return (object[property] = value);
    }
    case 'StaticMemberAssignmentTarget': {
      const object = i.evaluateExpression(expr.binding.object);
      const property = expr.binding.property;
      const value = i.evaluateExpression(expr.expression);
      return (object[property] = value);
    }
    case 'ArrayAssignmentTarget':
    case 'ObjectAssignmentTarget':
    default:
      return i.skipOrThrow(expr.binding.type);
  }
});

nodeHandler.set(UpdateExpression.name, (i: Interpreter, expr: UpdateExpression) => {
  switch (expr.operand.type) {
    case 'AssignmentTargetIdentifier': {
      const currentValue = i.getVariableValue(expr.operand);
      const nextValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
      // I don't know why I need to cast this. It's fine 2 lines above. VSCode bug?
      i.updateVariableValue(expr.operand as Identifier, nextValue);
      return expr.isPrefix ? nextValue : currentValue;
    }
    case 'ComputedMemberAssignmentTarget': {
      const object = i.evaluateExpression(expr.operand.object);
      const property = i.evaluateExpression(expr.operand.expression);
      const currentValue = object[property];
      const nextValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
      object[property] = nextValue;
      return expr.isPrefix ? nextValue : currentValue;
    }
    case 'StaticMemberAssignmentTarget': {
      const object = i.evaluateExpression(expr.operand.object);
      const property = expr.operand.property;
      const currentValue = object[property];
      const nextValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
      object[property] = nextValue;
      return expr.isPrefix ? nextValue : currentValue;
    }
    default:
      return;
  }
});

nodeHandler.set(CompoundAssignmentExpression.name, (i: Interpreter, expr: CompoundAssignmentExpression) => {
  const operation = compoundAssignmentOperatorMap.get(expr.operator);
  switch (expr.binding.type) {
    case 'AssignmentTargetIdentifier': {
      const currentValue = i.getVariableValue(expr.binding);
      return i.updateVariableValue(expr.binding, operation(currentValue, i.evaluateExpression(expr.expression)));
    }
    case 'ComputedMemberAssignmentTarget': {
      const object = i.evaluateExpression(expr.binding.object);
      const property = i.evaluateExpression(expr.binding.expression);
      const currentValue = object[property];
      return (object[property] = operation(currentValue, i.evaluateExpression(expr.expression)));
    }
    case 'StaticMemberAssignmentTarget': {
      const object = i.evaluateExpression(expr.binding.object);
      const property = expr.binding.property;
      const currentValue = object[property];
      return (object[property] = operation(currentValue, i.evaluateExpression(expr.expression)));
    }
    default:
      return;
  }
});

nodeHandler.set(LiteralRegExpExpression.name, (i: Interpreter, expr: LiteralRegExpExpression) => {
  const flags = [
    expr.global ? 'g' : '',
    expr.ignoreCase ? 'i' : '',
    expr.dotAll ? 's' : '',
    expr.multiLine ? 'm' : '',
    expr.sticky ? 'y' : '',
    expr.unicode ? 'u' : '',
  ].filter(_ => !!_);
  return new RegExp(expr.pattern, ...flags);
});

nodeHandler.set(TemplateExpression.name, (i: Interpreter, expr: TemplateExpression) => {
  return expr.elements
    .map(el => {
      if (el.type === 'TemplateElement') {
        return el.rawValue;
      } else {
        return i.evaluateExpression(el);
      }
    })
    .join('');
});

nodeHandler.set(UnaryExpression.name, (i: Interpreter, expr: UnaryExpression) => {
  const operation = unaryOperatorMap.get(expr.operator);
  if (!operation) return i.skipOrThrow(`${expr.type} : ${expr.operator}`);
  return operation!(i.evaluateExpression(expr.operand));
});

nodeHandler.set(ArrowExpression.name, (i: Interpreter, expr: ArrowExpression) =>
  createArrowFunction(expr, i.getCurrentContext(), i),
);
nodeHandler.set(FunctionExpression.name, (i: Interpreter, expr: FunctionExpression) => createFunction(expr, i));
nodeHandler.set(IdentifierExpression.name, (i: Interpreter, expr: IdentifierExpression) => i.getVariableValue(expr));
nodeHandler.set(LiteralStringExpression.name, getLiteralValue);
nodeHandler.set(LiteralNumericExpression.name, getLiteralValue);
nodeHandler.set(LiteralBooleanExpression.name, getLiteralValue);
nodeHandler.set(LiteralInfinityExpression.name, () => 1 / 0);
nodeHandler.set(LiteralNullExpression.name, () => null);
nodeHandler.set(BinaryExpression.name, (i: Interpreter, expr: BinaryExpression) => {
  const operation = binaryOperatorMap.get(expr.operator);
  return operation!(i.evaluateExpression(expr.left), i.evaluateExpression(expr.right));
});
nodeHandler.set(UnaryExpression.name, (i: Interpreter, expr: UnaryExpression) => {
  const operation = unaryOperatorMap.get(expr.operator);
  if (!operation) return i.skipOrThrow(`${expr.type} : ${expr.operator}`);
  return operation!(i.evaluateExpression(expr.operand));
});