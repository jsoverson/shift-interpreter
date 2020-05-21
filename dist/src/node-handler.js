"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("./errors");
const operators_1 = require("./operators");
const return_value_1 = require("./return-value");
class NodeHandler {
    constructor(interpreter) {
        this.interpreter = interpreter;
    }
    ReturnStatement(stmt) {
        return new return_value_1.ReturnValueWithState(this.interpreter.evaluateExpression(stmt.expression), { didReturn: true });
    }
    ExpressionStatement(stmt) {
        return this.interpreter.evaluateExpression(stmt.expression);
    }
    VariableDeclarationStatement(stmt) {
        return this.interpreter.declareVariables(stmt.declaration);
    }
    VariableDeclarator(declarator) {
        return this.interpreter.bindVariable(declarator.binding, this.interpreter.evaluateExpression(declarator.init));
    }
    FunctionDeclaration(decl) {
        const variables = this.interpreter.scopeLookup.get(decl.name);
        if (variables.length > 1)
            throw new Error('reproduce this and handle it better');
        const variable = variables[0];
        const fn = this.interpreter.createFunction(decl);
        this.interpreter.variableMap.set(variable, fn);
    }
    BlockStatement(stmt) {
        return this.interpreter.evaluateBlock(stmt.block);
    }
    ClassDeclaration(decl) {
        const staticMethods = [];
        const methods = [];
        let constructor = null;
        if (decl.elements.length > 0) {
            decl.elements.forEach(el => {
                if (el.method.type === 'Method') {
                    const intermediateFunction = this.interpreter.createFunction(el.method);
                    if (el.isStatic) {
                        staticMethods.push([intermediateFunction.name, intermediateFunction]);
                    }
                    else {
                        if (intermediateFunction.name === 'constructor')
                            constructor = intermediateFunction;
                        else
                            methods.push([intermediateFunction.name, intermediateFunction]);
                    }
                }
                else {
                    this.interpreter.skipOrThrow(`ClassElement type ${el.method.type}`);
                }
            });
        }
        let Class = class {
        };
        if (decl.super) {
            Class = ((SuperClass = this.interpreter.evaluateExpression(decl.super)) => {
                if (constructor === null) {
                    class InterpreterClassWithExtendsA extends SuperClass {
                        constructor(...args) {
                            super(...args);
                        }
                    }
                    return InterpreterClassWithExtendsA;
                }
                else {
                    class InterpreterClassWithExtendsB extends SuperClass {
                        constructor(...args) {
                            super(...args);
                            constructor(args, this);
                        }
                    }
                    return InterpreterClassWithExtendsB;
                }
            })();
        }
        else {
            Class = (() => {
                if (constructor === null) {
                    class InterpreterClassA {
                        constructor() { }
                    }
                    return InterpreterClassA;
                }
                else {
                    class InterpreterClassB {
                        constructor(...args) {
                            constructor(args, this);
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
        variables.forEach((variable) => this.interpreter.variableMap.set(variable, Class));
        return Class;
    }
    IfStatement(stmt) {
        const test = this.interpreter.evaluateExpression(stmt.test);
        if (test)
            return this.interpreter.evaluateStatement(stmt.consequent);
        else if (stmt.alternate)
            return this.interpreter.evaluateStatement(stmt.alternate);
    }
    ConditionalExpression(stmt) {
        const test = this.interpreter.evaluateExpression(stmt.test);
        if (test)
            return this.interpreter.evaluateExpression(stmt.consequent);
        else if (stmt.alternate)
            return this.interpreter.evaluateExpression(stmt.alternate);
    }
    ThrowStatement(stmt) {
        throw this.interpreter.evaluateExpression(stmt.expression);
    }
    TryCatchStatement(stmt) {
        let returnValue = undefined;
        try {
            returnValue = this.interpreter.evaluateBlock(stmt.body);
            if (returnValue instanceof return_value_1.ReturnValueWithState) {
                if (returnValue.didReturn)
                    return returnValue;
            }
        }
        catch (e) {
            this.interpreter.bindVariable(stmt.catchClause.binding, e);
            returnValue = this.interpreter.evaluateBlock(stmt.catchClause.body);
            if (returnValue instanceof return_value_1.ReturnValueWithState) {
                if (returnValue.didReturn)
                    return returnValue;
            }
        }
        return returnValue;
    }
    TryFinallyStatement(stmt) {
        let returnValue = undefined;
        if (stmt.catchClause) {
            try {
                returnValue = this.interpreter.evaluateBlock(stmt.body);
                if (returnValue instanceof return_value_1.ReturnValueWithState) {
                    if (returnValue.didReturn)
                        return returnValue;
                }
            }
            catch (e) {
                this.interpreter.bindVariable(stmt.catchClause.binding, e);
                returnValue = this.interpreter.evaluateBlock(stmt.catchClause.body);
                if (returnValue instanceof return_value_1.ReturnValueWithState) {
                    if (returnValue.didReturn)
                        return returnValue;
                }
            }
            finally {
                returnValue = this.interpreter.evaluateBlock(stmt.finalizer);
                if (returnValue instanceof return_value_1.ReturnValueWithState) {
                    if (returnValue.didReturn)
                        return returnValue;
                }
            }
        }
        else {
            try {
                returnValue = this.interpreter.evaluateBlock(stmt.body);
                if (returnValue instanceof return_value_1.ReturnValueWithState) {
                    if (returnValue.didReturn)
                        return returnValue;
                }
            }
            finally {
                returnValue = this.interpreter.evaluateBlock(stmt.finalizer);
                if (returnValue instanceof return_value_1.ReturnValueWithState) {
                    if (returnValue.didReturn)
                        return returnValue;
                }
            }
        }
        return returnValue;
    }
    ForOfStatement(stmt) {
        this.interpreter.currentLoops.push(stmt);
        const iterationExpression = this.interpreter.evaluateExpression(stmt.right);
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
                    this.interpreter.declareVariables(stmt.left);
                    const binding = stmt.left.declarators[0].binding;
                    if (binding.type === 'BindingIdentifier')
                        this.interpreter.updateVariableValue(binding, value);
                    else
                        this.interpreter.skipOrThrow(stmt.type + '.left->' + binding.type);
                    break;
                }
                default:
                    this.interpreter.skipOrThrow(stmt.type + '.left->' + stmt.left.type);
            }
            this.interpreter.evaluateStatement(stmt.body);
        }
    }
    ForInStatement(stmt) {
        this.interpreter.currentLoops.push(stmt);
        const iterationExpression = this.interpreter.evaluateExpression(stmt.right);
        switch (stmt.left.type) {
            case 'VariableDeclaration': {
                this.interpreter.declareVariables(stmt.left);
                const binding = stmt.left.declarators[0].binding;
                for (let a in iterationExpression) {
                    if (binding.type === 'BindingIdentifier')
                        this.interpreter.updateVariableValue(binding, a);
                    else
                        this.interpreter.skipOrThrow(stmt.type + '.left->' + binding.type);
                    this.interpreter.evaluateStatement(stmt.body);
                }
                break;
            }
            default:
                this.interpreter.skipOrThrow(stmt.type + '.left->' + stmt.left.type);
        }
    }
    ForStatement(stmt) {
        this.interpreter.currentLoops.push(stmt);
        if (stmt.init) {
            if (stmt.init.type === 'VariableDeclaration')
                this.interpreter.declareVariables(stmt.init);
            else
                this.interpreter.evaluateExpression(stmt.init);
        }
        while (this.interpreter.evaluateExpression(stmt.test)) {
            if (stmt.body.type === 'BlockStatement') {
                const blockResult = this.interpreter.evaluateBlock(stmt.body.block);
                if (blockResult.didBreak)
                    break;
            }
            else {
                this.interpreter.evaluateStatement(stmt.body);
            }
            if (stmt.update)
                this.interpreter.evaluateExpression(stmt.update);
        }
        this.interpreter.currentLoops.pop();
    }
    WhileStatement(stmt) {
        this.interpreter.currentLoops.push(stmt);
        while (this.interpreter.evaluateExpression(stmt.test)) {
            if (stmt.body.type === 'BlockStatement') {
                const blockResult = this.interpreter.evaluateBlock(stmt.body.block);
                if (blockResult.didBreak)
                    break;
            }
            else {
                this.interpreter.evaluateStatement(stmt.body);
            }
        }
        this.interpreter.currentLoops.pop();
    }
    DoWhileStatement(stmt) {
        this.interpreter.currentLoops.push(stmt);
        do {
            if (stmt.body.type === 'BlockStatement') {
                const blockResult = this.interpreter.evaluateBlock(stmt.body.block);
                if (blockResult.didBreak)
                    break;
            }
            else {
                this.interpreter.evaluateStatement(stmt.body);
            }
        } while (this.interpreter.evaluateExpression(stmt.test));
        this.interpreter.currentLoops.pop();
    }
    ThisExpression(expr) {
        return this.interpreter.getCurrentContext();
    }
    NewExpression(expr) {
        const ClassTarget = this.interpreter.evaluateExpression(expr.callee);
        const args = [];
        expr.arguments.forEach(_ => {
            if (_.type === 'SpreadElement') {
                const value = this.interpreter.evaluateExpression(_.expression);
                args.push(...value);
            }
            else {
                args.push(this.interpreter.evaluateExpression(_));
            }
        });
        this.interpreter.currentNode = expr;
        return new ClassTarget(...args);
    }
    ArrayExpression(expr) {
        return expr.elements.flatMap(el => {
            if (el === null) {
                return [null];
            }
            else if (el.type === 'SpreadElement') {
                const iterable = this.interpreter.evaluateExpression(el.expression);
                return Array.from(iterable);
            }
            else {
                return [this.interpreter.evaluateExpression(el)];
            }
        });
    }
    ObjectExpression(expr) {
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
                    const name = prop.name.type === 'StaticPropertyName'
                        ? prop.name.value
                        : this.interpreter.evaluateExpression(prop.name.expression);
                    obj[name] = this.interpreter.evaluateExpression(prop.expression);
                    break;
                }
                case 'Method': {
                    const name = prop.name.type === 'StaticPropertyName'
                        ? prop.name.value
                        : this.interpreter.evaluateExpression(prop.name.expression);
                    obj[name] = this.interpreter.createFunction(prop);
                    break;
                }
                case 'ShorthandProperty': {
                    const name = prop.name.name;
                    const value = this.interpreter.getVariableValue(prop.name);
                    obj[name] = value;
                    break;
                }
                case 'Getter': {
                    const name = prop.name.type === 'StaticPropertyName'
                        ? prop.name.value
                        : this.interpreter.evaluateExpression(prop.name.expression);
                    const operations = getPropertyDescriptors(name);
                    operations.set('get', this.interpreter.createFunction(prop));
                    break;
                }
                case 'Setter': {
                    const name = prop.name.type === 'StaticPropertyName'
                        ? prop.name.value
                        : this.interpreter.evaluateExpression(prop.name.expression);
                    const operations = getPropertyDescriptors(name);
                    operations.set('set', this.interpreter.createFunction(prop));
                    break;
                }
                default:
                    this.interpreter.skipOrThrow(`${expr.type}[${prop.type}]`);
            }
        });
        Array.from(batchOperations.entries()).forEach(([prop, ops]) => {
            const descriptor = {
                get: ops.get('get'),
                set: ops.get('set'),
                configurable: true,
            };
            Object.defineProperty(obj, prop, descriptor);
        });
        return obj;
    }
    StaticMemberExpression(expr) {
        if (expr.object.type === 'Super')
            return this.interpreter.skipOrThrow(expr.object.type);
        const object = this.interpreter.evaluateExpression(expr.object);
        const value = object[expr.property];
        return value;
    }
    ComputedMemberExpression(expr) {
        if (expr.object.type === 'Super')
            return this.interpreter.skipOrThrow(expr.object.type);
        const object = this.interpreter.evaluateExpression(expr.object);
        const value = object[this.interpreter.evaluateExpression(expr.expression)];
        // if (typeof value === "function") return value.bind(object);
        return value;
    }
    CallExpression(expr) {
        if (expr.callee.type === 'Super')
            return this.interpreter.skipOrThrow(expr.callee.type);
        const args = [];
        expr.arguments.forEach(_ => {
            if (_.type === 'SpreadElement') {
                const value = this.interpreter.evaluateExpression(_.expression);
                args.push(...value);
            }
            else {
                args.push(this.interpreter.evaluateExpression(_));
            }
        });
        let context = this.interpreter.getCurrentContext();
        let fn = null;
        if (expr.callee.type === 'StaticMemberExpression') {
            context = this.interpreter.evaluateExpression(expr.callee.object);
            fn = context[expr.callee.property];
        }
        else if (expr.callee.type === 'ComputedMemberExpression') {
            context = this.interpreter.evaluateExpression(expr.callee.object);
            fn = context[this.interpreter.evaluateExpression(expr.callee.expression)];
        }
        else {
            fn = this.interpreter.evaluateExpression(expr.callee);
        }
        if (typeof fn === 'function') {
            return fn.apply(context, args);
        }
        else {
            throw new Error(`Can not execute non-function ${JSON.stringify(expr)}`);
        }
    }
    AssignmentExpression(expr) {
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
    UpdateExpression(expr) {
        switch (expr.operand.type) {
            case 'AssignmentTargetIdentifier': {
                const currentValue = this.interpreter.getVariableValue(expr.operand);
                const nextValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
                // I don't know why I need to cast this. It's fine 2 lines above. VSCode bug?
                this.interpreter.updateVariableValue(expr.operand, nextValue);
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
    CompoundAssignmentExpression(expr) {
        const operation = operators_1.compoundAssignmentOperatorMap.get(expr.operator);
        switch (expr.binding.type) {
            case 'AssignmentTargetIdentifier': {
                const currentValue = this.interpreter.getVariableValue(expr.binding);
                return this.interpreter.updateVariableValue(expr.binding, operation(currentValue, this.interpreter.evaluateExpression(expr.expression)));
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
    LiteralRegExpExpression(expr) {
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
    TemplateExpression(expr) {
        return expr.elements
            .map(el => {
            if (el.type === 'TemplateElement') {
                return el.rawValue;
            }
            else {
                return this.interpreter.evaluateExpression(el);
            }
        })
            .join('');
    }
    ArrowExpression(expr) {
        const interpreter = this.interpreter;
        return function () {
            return (...args) => {
                interpreter.pushContext(this);
                expr.params.items.forEach((param, i) => {
                    interpreter.bindVariable(param, args[i]);
                });
                let returnValue = undefined;
                if (expr.body.type === 'FunctionBody') {
                    const blockResult = interpreter.evaluateBlock(expr.body);
                    returnValue = blockResult.value;
                }
                else {
                    returnValue = interpreter.evaluateExpression(expr.body);
                }
                interpreter.popContext();
                return returnValue;
            };
        }.bind(interpreter.getCurrentContext())();
    }
    FunctionExpression(expr) {
        return this.interpreter.createFunction(expr);
    }
    IdentifierExpression(expr) {
        return this.interpreter.getVariableValue(expr);
    }
    LiteralNumericExpression(expr) {
        return expr.value;
    }
    LiteralStringExpression(expr) {
        return expr.value;
    }
    LiteralBooleanExpression(expr) {
        return expr.value;
    }
    LiteralInfinityExpression(expr) {
        return 1 / 0;
    }
    LiteralNullExpression(expr) {
        return null;
    }
    BinaryExpression(expr) {
        const operation = operators_1.binaryOperatorMap.get(expr.operator);
        return operation(this.interpreter.evaluateExpression(expr.left), this.interpreter.evaluateExpression(expr.right));
    }
    UnaryExpression(expr) {
        const operation = operators_1.unaryOperatorMap.get(expr.operator);
        if (!operation)
            return this.interpreter.skipOrThrow(`${expr.type} : ${expr.operator}`);
        return operation(this.interpreter.evaluateExpression(expr.operand));
    }
    // TODO move any possible logic here.
    BreakStatement(...args) {
    }
    ContinueStatement(...args) {
    }
    EmptyStatement(...args) {
    }
    // TODO support these nodes
    WithStatement(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    SwitchStatementWithDefault(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    SwitchStatement(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    LabeledStatement(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    ForAwaitStatement(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    DebuggerStatement(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    NewTargetExpression(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    AwaitExpression(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    Super(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    ClassExpression(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    YieldExpression(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    YieldGeneratorExpression(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
}
exports.NodeHandler = NodeHandler;
//# sourceMappingURL=node-handler.js.map