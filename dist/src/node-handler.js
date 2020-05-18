"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shift_ast_1 = require("shift-ast");
const intermediate_types_1 = require("./intermediate-types");
const interpreter_1 = require("./interpreter");
const operators_1 = require("./operators");
exports.nodeHandler = new Map();
function getLiteralValue(interpreter, expr) {
    return expr.value;
}
exports.nodeHandler.set(shift_ast_1.ReturnStatement.name, (i, stmt) => new interpreter_1.ReturnValueWithState(i.evaluateExpression(stmt.expression), { didReturn: true }));
exports.nodeHandler.set(shift_ast_1.ExpressionStatement.name, (i, stmt) => i.evaluateExpression(stmt.expression));
exports.nodeHandler.set(shift_ast_1.VariableDeclarationStatement.name, (i, stmt) => i.declareVariables(stmt.declaration));
exports.nodeHandler.set(shift_ast_1.FunctionDeclaration.name, (i, stmt) => i.declareFunction(stmt));
exports.nodeHandler.set(shift_ast_1.BlockStatement.name, (i, stmt) => i.evaluateBlock(stmt.block));
exports.nodeHandler.set(shift_ast_1.ClassDeclaration.name, (i, stmt) => i.declareClass(stmt));
exports.nodeHandler.set(shift_ast_1.IfStatement.name, (i, stmt) => {
    const test = i.evaluateExpression(stmt.test);
    if (test)
        return i.evaluateStatement(stmt.consequent);
    else if (stmt.alternate)
        return i.evaluateStatement(stmt.alternate);
});
exports.nodeHandler.set(shift_ast_1.ConditionalExpression.name, (i, stmt) => {
    const test = i.evaluateExpression(stmt.test);
    if (test)
        return i.evaluateExpression(stmt.consequent);
    else if (stmt.alternate)
        return i.evaluateExpression(stmt.alternate);
});
exports.nodeHandler.set(shift_ast_1.BreakStatement.name, () => { });
exports.nodeHandler.set(shift_ast_1.ContinueStatement.name, () => { });
exports.nodeHandler.set(shift_ast_1.EmptyStatement.name, () => { });
exports.nodeHandler.set(shift_ast_1.ThrowStatement.name, (i, stmt) => {
    throw i.evaluateExpression(stmt.expression);
});
exports.nodeHandler.set(shift_ast_1.TryCatchStatement.name, (i, stmt) => {
    let returnValue = undefined;
    try {
        returnValue = i.evaluateBlock(stmt.body);
        if (returnValue instanceof interpreter_1.ReturnValueWithState) {
            if (returnValue.didReturn)
                return returnValue;
        }
    }
    catch (e) {
        i.bindVariable(stmt.catchClause.binding, e);
        returnValue = i.evaluateBlock(stmt.catchClause.body);
        if (returnValue instanceof interpreter_1.ReturnValueWithState) {
            if (returnValue.didReturn)
                return returnValue;
        }
    }
    return returnValue;
});
exports.nodeHandler.set(shift_ast_1.TryFinallyStatement.name, (i, stmt) => {
    let returnValue = undefined;
    if (stmt.catchClause) {
        try {
            returnValue = i.evaluateBlock(stmt.body);
            if (returnValue instanceof interpreter_1.ReturnValueWithState) {
                if (returnValue.didReturn)
                    return returnValue;
            }
        }
        catch (e) {
            i.bindVariable(stmt.catchClause.binding, e);
            returnValue = i.evaluateBlock(stmt.catchClause.body);
            if (returnValue instanceof interpreter_1.ReturnValueWithState) {
                if (returnValue.didReturn)
                    return returnValue;
            }
        }
        finally {
            returnValue = i.evaluateBlock(stmt.finalizer);
            if (returnValue instanceof interpreter_1.ReturnValueWithState) {
                if (returnValue.didReturn)
                    return returnValue;
            }
        }
    }
    else {
        try {
            returnValue = i.evaluateBlock(stmt.body);
            if (returnValue instanceof interpreter_1.ReturnValueWithState) {
                if (returnValue.didReturn)
                    return returnValue;
            }
        }
        finally {
            returnValue = i.evaluateBlock(stmt.finalizer);
            if (returnValue instanceof interpreter_1.ReturnValueWithState) {
                if (returnValue.didReturn)
                    return returnValue;
            }
        }
    }
    return returnValue;
});
exports.nodeHandler.set(shift_ast_1.ForOfStatement.name, (i, stmt) => {
    i.currentLoops.push(stmt);
    const iterationExpression = i.evaluateExpression(stmt.right);
    function* nextValue() {
        yield* iterationExpression;
    }
    let iterator = nextValue();
    let result = null;
    while ((result = iterator.next())) {
        if (result.done)
            break;
        const { value } = result;
        switch (stmt.left.type) {
            case 'VariableDeclaration': {
                i.declareVariables(stmt.left);
                const binding = stmt.left.declarators[0].binding;
                if (binding.type === 'BindingIdentifier')
                    i.updateVariableValue(binding, value);
                else
                    i.skipOrThrow(stmt.type + '.left->' + binding.type);
                break;
            }
            default:
                i.skipOrThrow(stmt.type + '.left->' + stmt.left.type);
        }
        i.evaluateStatement(stmt.body);
    }
});
exports.nodeHandler.set(shift_ast_1.ForInStatement.name, (i, stmt) => {
    i.currentLoops.push(stmt);
    const iterationExpression = i.evaluateExpression(stmt.right);
    switch (stmt.left.type) {
        case 'VariableDeclaration': {
            i.declareVariables(stmt.left);
            const binding = stmt.left.declarators[0].binding;
            for (let a in iterationExpression) {
                if (binding.type === 'BindingIdentifier')
                    i.updateVariableValue(binding, a);
                else
                    i.skipOrThrow(stmt.type + '.left->' + binding.type);
                i.evaluateStatement(stmt.body);
            }
            break;
        }
        default:
            i.skipOrThrow(stmt.type + '.left->' + stmt.left.type);
    }
});
exports.nodeHandler.set(shift_ast_1.ForStatement.name, (i, stmt) => {
    i.currentLoops.push(stmt);
    if (stmt.init) {
        if (stmt.init.type === 'VariableDeclaration')
            i.declareVariables(stmt.init);
        else
            i.evaluateExpression(stmt.init);
    }
    while (i.evaluateExpression(stmt.test)) {
        if (stmt.body.type === 'BlockStatement') {
            const blockResult = i.evaluateBlock(stmt.body.block);
            if (blockResult.didBreak)
                break;
        }
        else {
            i.evaluateStatement(stmt.body);
        }
        if (stmt.update)
            i.evaluateExpression(stmt.update);
    }
    i.currentLoops.pop();
});
exports.nodeHandler.set(shift_ast_1.WhileStatement.name, (i, stmt) => {
    i.currentLoops.push(stmt);
    while (i.evaluateExpression(stmt.test)) {
        if (stmt.body.type === 'BlockStatement') {
            const blockResult = i.evaluateBlock(stmt.body.block);
            if (blockResult.didBreak)
                break;
        }
        else {
            i.evaluateStatement(stmt.body);
        }
    }
    i.currentLoops.pop();
});
exports.nodeHandler.set(shift_ast_1.DoWhileStatement.name, (i, stmt) => {
    i.currentLoops.push(stmt);
    do {
        if (stmt.body.type === 'BlockStatement') {
            const blockResult = i.evaluateBlock(stmt.body.block);
            if (blockResult.didBreak)
                break;
        }
        else {
            i.evaluateStatement(stmt.body);
        }
    } while (i.evaluateExpression(stmt.test));
    i.currentLoops.pop();
});
exports.nodeHandler.set(shift_ast_1.ThisExpression.name, (i, expr) => i.getCurrentContext());
exports.nodeHandler.set(shift_ast_1.NewExpression.name, (i, expr) => {
    const ClassTarget = i.evaluateExpression(expr.callee);
    const args = [];
    expr.arguments.forEach(_ => {
        if (_.type === 'SpreadElement') {
            const value = i.evaluateExpression(_.expression);
            args.push(...value);
        }
        else {
            args.push(i.evaluateExpression(_));
        }
    });
    return new ClassTarget(...args);
});
exports.nodeHandler.set(shift_ast_1.ArrayExpression.name, (i, expr) => {
    return expr.elements.flatMap(el => {
        if (el === null) {
            return [null];
        }
        else if (el.type === 'SpreadElement') {
            const iterable = i.evaluateExpression(el.expression);
            return Array.from(iterable);
        }
        else {
            return [i.evaluateExpression(el)];
        }
    });
});
exports.nodeHandler.set(shift_ast_1.ObjectExpression.name, (i, expr) => {
    const obj = {};
    const batchOperations = new Map();
    function getPropertyDescriptors(name) {
        if (batchOperations.has(name))
            return batchOperations.get(name);
        const operations = new Map();
        batchOperations.set(name, operations);
        return operations;
    }
    expr.properties.forEach(prop => {
        switch (prop.type) {
            case 'DataProperty': {
                const name = prop.name.type === 'StaticPropertyName' ? prop.name.value : i.evaluateExpression(prop.name.expression);
                obj[name] = i.evaluateExpression(prop.expression);
                break;
            }
            case 'Method': {
                const name = prop.name.type === 'StaticPropertyName' ? prop.name.value : i.evaluateExpression(prop.name.expression);
                obj[name] = intermediate_types_1.createFunction(prop, i);
                break;
            }
            case 'ShorthandProperty': {
                const name = prop.name.name;
                const value = i.getVariableValue(prop.name);
                obj[name] = value;
                break;
            }
            case 'Getter': {
                const name = prop.name.type === 'StaticPropertyName' ? prop.name.value : i.evaluateExpression(prop.name.expression);
                const operations = getPropertyDescriptors(name);
                operations.set('get', intermediate_types_1.createFunction(prop, i));
                break;
            }
            case 'Setter': {
                const name = prop.name.type === 'StaticPropertyName' ? prop.name.value : i.evaluateExpression(prop.name.expression);
                const operations = getPropertyDescriptors(name);
                operations.set('set', intermediate_types_1.createFunction(prop, i));
                break;
            }
            default:
                i.skipOrThrow(`${expr.type}[${prop.type}]`);
        }
    });
    Array.from(batchOperations.entries()).forEach(([prop, ops]) => {
        const descriptor = {
            get: ops.get('get'),
            set: ops.get('set'),
            configurable: true
        };
        Object.defineProperty(obj, prop, descriptor);
    });
    return obj;
});
exports.nodeHandler.set(shift_ast_1.StaticMemberExpression.name, (i, expr) => {
    if (expr.object.type === 'Super')
        return i.skipOrThrow(expr.object.type);
    const object = i.evaluateExpression(expr.object);
    const value = object[expr.property];
    return value;
});
exports.nodeHandler.set(shift_ast_1.ComputedMemberExpression.name, (i, expr) => {
    if (expr.object.type === 'Super')
        return i.skipOrThrow(expr.object.type);
    const object = i.evaluateExpression(expr.object);
    const value = object[i.evaluateExpression(expr.expression)];
    // if (typeof value === "function") return value.bind(object);
    return value;
});
exports.nodeHandler.set(shift_ast_1.CallExpression.name, (i, expr) => {
    if (expr.callee.type === 'Super')
        return i.skipOrThrow(expr.callee.type);
    const args = [];
    expr.arguments.forEach(_ => {
        if (_.type === 'SpreadElement') {
            const value = i.evaluateExpression(_.expression);
            args.push(...value);
        }
        else {
            args.push(i.evaluateExpression(_));
        }
    });
    let context = i.getCurrentContext();
    let fn = null;
    if (expr.callee.type === 'StaticMemberExpression') {
        context = i.evaluateExpression(expr.callee.object);
        fn = context[expr.callee.property];
    }
    else if (expr.callee.type === 'ComputedMemberExpression') {
        context = i.evaluateExpression(expr.callee.object);
        fn = context[i.evaluateExpression(expr.callee.expression)];
    }
    else {
        fn = i.evaluateExpression(expr.callee);
    }
    if (typeof fn === 'function') {
        return fn.apply(context, args);
    }
    else {
        throw new Error(`Can not execute non-function ${JSON.stringify(expr)}`);
    }
});
exports.nodeHandler.set(shift_ast_1.AssignmentExpression.name, (i, expr) => {
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
exports.nodeHandler.set(shift_ast_1.UpdateExpression.name, (i, expr) => {
    switch (expr.operand.type) {
        case 'AssignmentTargetIdentifier': {
            const currentValue = i.getVariableValue(expr.operand);
            const nextValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
            // I don't know why I need to cast this. It's fine 2 lines above. VSCode bug?
            i.updateVariableValue(expr.operand, nextValue);
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
exports.nodeHandler.set(shift_ast_1.CompoundAssignmentExpression.name, (i, expr) => {
    const operation = operators_1.compoundAssignmentOperatorMap.get(expr.operator);
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
exports.nodeHandler.set(shift_ast_1.LiteralRegExpExpression.name, (i, expr) => {
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
exports.nodeHandler.set(shift_ast_1.TemplateExpression.name, (i, expr) => {
    return expr.elements
        .map(el => {
        if (el.type === 'TemplateElement') {
            return el.rawValue;
        }
        else {
            return i.evaluateExpression(el);
        }
    })
        .join('');
});
exports.nodeHandler.set(shift_ast_1.UnaryExpression.name, (i, expr) => {
    const operation = operators_1.unaryOperatorMap.get(expr.operator);
    if (!operation)
        return i.skipOrThrow(`${expr.type} : ${expr.operator}`);
    return operation(i.evaluateExpression(expr.operand));
});
exports.nodeHandler.set(shift_ast_1.ArrowExpression.name, (i, expr) => intermediate_types_1.createArrowFunction(expr, i.getCurrentContext(), i));
exports.nodeHandler.set(shift_ast_1.FunctionExpression.name, (i, expr) => intermediate_types_1.createFunction(expr, i));
exports.nodeHandler.set(shift_ast_1.IdentifierExpression.name, (i, expr) => i.getVariableValue(expr));
exports.nodeHandler.set(shift_ast_1.LiteralStringExpression.name, getLiteralValue);
exports.nodeHandler.set(shift_ast_1.LiteralNumericExpression.name, getLiteralValue);
exports.nodeHandler.set(shift_ast_1.LiteralBooleanExpression.name, getLiteralValue);
exports.nodeHandler.set(shift_ast_1.LiteralInfinityExpression.name, () => 1 / 0);
exports.nodeHandler.set(shift_ast_1.LiteralNullExpression.name, () => null);
exports.nodeHandler.set(shift_ast_1.BinaryExpression.name, (i, expr) => {
    const operation = operators_1.binaryOperatorMap.get(expr.operator);
    return operation(i.evaluateExpression(expr.left), i.evaluateExpression(expr.right));
});
exports.nodeHandler.set(shift_ast_1.UnaryExpression.name, (i, expr) => {
    const operation = operators_1.unaryOperatorMap.get(expr.operator);
    if (!operation)
        return i.skipOrThrow(`${expr.type} : ${expr.operator}`);
    return operation(i.evaluateExpression(expr.operand));
});
//# sourceMappingURL=node-handler.js.map