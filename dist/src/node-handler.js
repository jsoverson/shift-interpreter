"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("./errors");
const operators_1 = require("./operators");
const return_value_1 = require("./return-value");
const debug_1 = __importDefault(require("debug"));
const RuntimeValue_1 = require("./RuntimeValue");
const debug = debug_1.default('shift:interpreter:node-handler');
class NodeHandler {
    constructor(interpreter) {
        this.interpreter = interpreter;
    }
    async ReturnStatement(stmt) {
        const value = await this.interpreter.evaluateNext(stmt.expression);
        return new return_value_1.ReturnValueWithState(value, { didReturn: true });
    }
    async ExpressionStatement(stmt) {
        return await this.interpreter.evaluateNext(stmt.expression);
    }
    async VariableDeclarationStatement(stmt) {
        return this.interpreter.declareVariables(stmt.declaration);
    }
    async VariableDeclarator(declarator) {
        const value = await this.interpreter.evaluateNext(declarator.init);
        return await this.interpreter.bindVariable(declarator.binding, value);
    }
    async FunctionDeclaration(decl) {
        const variables = this.interpreter.scopeLookup.get(decl.name);
        if (variables.length > 1)
            throw new Error('reproduce this and handle it better');
        const variable = variables[0];
        const fn = this.interpreter.createFunction(decl);
        this.interpreter.variableMap.set(variable, fn);
    }
    async BlockStatement(stmt) {
        return await this.interpreter.evaluateNext(stmt.block);
    }
    async ClassDeclaration(decl) {
        const staticMethods = [];
        const methods = [];
        let constructor = null;
        if (decl.elements.length > 0) {
            for (let el of decl.elements) {
                if (el.method.type === 'Method') {
                    const intermediateFunction = await this.interpreter.createFunction(el.method);
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
            }
        }
        let Class = class {
        };
        if (decl.super) {
            const xtends = await this.interpreter.evaluateNext(decl.super);
            Class = ((SuperClass = xtends) => {
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
    async IfStatement(stmt) {
        const test = await this.interpreter.evaluateNext(stmt.test);
        if (test)
            return this.interpreter.evaluateNext(stmt.consequent);
        else if (stmt.alternate)
            return this.interpreter.evaluateNext(stmt.alternate);
    }
    async ConditionalExpression(stmt) {
        const test = await this.interpreter.evaluateNext(stmt.test);
        if (test)
            return this.interpreter.evaluateNext(stmt.consequent);
        else if (stmt.alternate)
            return this.interpreter.evaluateNext(stmt.alternate);
    }
    async ThrowStatement(stmt) {
        throw await this.interpreter.evaluateNext(stmt.expression);
    }
    async TryCatchStatement(stmt) {
        let returnValue = undefined;
        try {
            returnValue = await this.interpreter.evaluateNext(stmt.body);
            if (returnValue instanceof return_value_1.ReturnValueWithState) {
                if (returnValue.didReturn)
                    return returnValue;
            }
        }
        catch (e) {
            await this.interpreter.bindVariable(stmt.catchClause.binding, e);
            returnValue = await this.interpreter.evaluateNext(stmt.catchClause.body);
            if (returnValue instanceof return_value_1.ReturnValueWithState) {
                if (returnValue.didReturn)
                    return returnValue;
            }
        }
        return returnValue;
    }
    async TryFinallyStatement(stmt) {
        let returnValue = undefined;
        if (stmt.catchClause) {
            try {
                returnValue = await this.interpreter.evaluateNext(stmt.body);
                if (returnValue instanceof return_value_1.ReturnValueWithState) {
                    if (returnValue.didReturn)
                        return returnValue;
                }
            }
            catch (e) {
                await this.interpreter.bindVariable(stmt.catchClause.binding, e);
                returnValue = await this.interpreter.evaluateNext(stmt.catchClause.body);
                if (returnValue instanceof return_value_1.ReturnValueWithState) {
                    if (returnValue.didReturn)
                        return returnValue;
                }
            }
            finally {
                returnValue = await this.interpreter.evaluateNext(stmt.finalizer);
                if (returnValue instanceof return_value_1.ReturnValueWithState) {
                    if (returnValue.didReturn)
                        return returnValue;
                }
            }
        }
        else {
            try {
                returnValue = await this.interpreter.evaluateNext(stmt.body);
                if (returnValue instanceof return_value_1.ReturnValueWithState) {
                    if (returnValue.didReturn)
                        return returnValue;
                }
            }
            finally {
                returnValue = await this.interpreter.evaluateNext(stmt.finalizer);
                if (returnValue instanceof return_value_1.ReturnValueWithState) {
                    if (returnValue.didReturn)
                        return returnValue;
                }
            }
        }
        return returnValue;
    }
    async ForOfStatement(stmt) {
        this.interpreter.currentLoops.push(stmt);
        const iterationExpression = await this.interpreter.evaluateNext(stmt.right);
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
                    await this.interpreter.declareVariables(stmt.left);
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
            await this.interpreter.evaluateNext(stmt.body);
        }
    }
    async ForInStatement(stmt) {
        this.interpreter.currentLoops.push(stmt);
        const iterationExpression = await this.interpreter.evaluateNext(stmt.right);
        switch (stmt.left.type) {
            case 'VariableDeclaration': {
                await this.interpreter.declareVariables(stmt.left);
                const binding = stmt.left.declarators[0].binding;
                for (let a in iterationExpression) {
                    if (binding.type === 'BindingIdentifier')
                        this.interpreter.updateVariableValue(binding, a);
                    else
                        this.interpreter.skipOrThrow(stmt.type + '.left->' + binding.type);
                    await this.interpreter.evaluateNext(stmt.body);
                }
                break;
            }
            default:
                this.interpreter.skipOrThrow(stmt.type + '.left->' + stmt.left.type);
        }
    }
    async ForStatement(stmt) {
        this.interpreter.currentLoops.push(stmt);
        if (stmt.init) {
            if (stmt.init.type === 'VariableDeclaration')
                await this.interpreter.declareVariables(stmt.init);
            else
                await this.interpreter.evaluateNext(stmt.init);
        }
        while (await this.interpreter.evaluateNext(stmt.test)) {
            if (stmt.body.type === 'BlockStatement') {
                const blockResult = await this.interpreter.evaluateNext(stmt.body.block);
                if (blockResult.didBreak)
                    break;
            }
            else {
                await this.interpreter.evaluateNext(stmt.body);
            }
            if (stmt.update)
                await this.interpreter.evaluateNext(stmt.update);
        }
        this.interpreter.currentLoops.pop();
    }
    async WhileStatement(stmt) {
        this.interpreter.currentLoops.push(stmt);
        while (await this.interpreter.evaluateNext(stmt.test)) {
            if (stmt.body.type === 'BlockStatement') {
                const blockResult = await this.interpreter.evaluateNext(stmt.body.block);
                if (blockResult.didBreak)
                    break;
            }
            else {
                await this.interpreter.evaluateNext(stmt.body);
            }
        }
        this.interpreter.currentLoops.pop();
    }
    async DoWhileStatement(stmt) {
        this.interpreter.currentLoops.push(stmt);
        do {
            if (stmt.body.type === 'BlockStatement') {
                const blockResult = await this.interpreter.evaluateNext(stmt.body.block);
                if (blockResult.didBreak)
                    break;
            }
            else {
                await this.interpreter.evaluateNext(stmt.body);
            }
        } while (await this.interpreter.evaluateNext(stmt.test));
        this.interpreter.currentLoops.pop();
    }
    async ThisExpression(expr) {
        return this.interpreter.getCurrentContext();
    }
    async NewExpression(expr) {
        const ClassTarget = await this.interpreter.evaluateNext(expr.callee);
        const args = [];
        for (let arg of expr.arguments) {
            if (arg.type === 'SpreadElement') {
                const value = await this.interpreter.evaluateNext(arg.expression);
                args.push(...value);
            }
            else {
                args.push(await this.interpreter.evaluateNext(arg));
            }
        }
        this.interpreter.currentNode = expr;
        return new ClassTarget(...args);
    }
    async ArrayExpression(expr) {
        const elements = [];
        for (let el of expr.elements) {
            if (el === null) {
                elements.push(null);
            }
            else if (el.type === 'SpreadElement') {
                const iterable = await this.interpreter.evaluateNext(el.expression);
                elements.push(...Array.from(iterable));
            }
            else {
                elements.push(await this.interpreter.evaluateNext(el));
            }
        }
        return elements;
    }
    async ObjectExpression(expr) {
        const _debug = debug.extend('ObjectExpression');
        const obj = {};
        const batchOperations = new Map();
        function getPropertyDescriptors(name) {
            if (batchOperations.has(name))
                return batchOperations.get(name);
            const operations = new Map();
            batchOperations.set(name, operations);
            return operations;
        }
        for (let prop of expr.properties) {
            switch (prop.type) {
                case 'DataProperty': {
                    const name = prop.name.type === 'StaticPropertyName'
                        ? prop.name.value
                        : await this.interpreter.evaluateNext(prop.name.expression);
                    obj[name] = await this.interpreter.evaluateNext(prop.expression);
                    break;
                }
                case 'Method': {
                    const name = prop.name.type === 'StaticPropertyName'
                        ? prop.name.value
                        : await this.interpreter.evaluateNext(prop.name.expression);
                    obj[name] = await this.interpreter.createFunction(prop);
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
                        : await this.interpreter.evaluateNext(prop.name.expression);
                    const operations = getPropertyDescriptors(name);
                    operations.set('get', await this.interpreter.createFunction(prop));
                    break;
                }
                case 'Setter': {
                    const name = prop.name.type === 'StaticPropertyName'
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
            const descriptor = {
                get: ops.get('get'),
                set: ops.get('set'),
                configurable: true,
            };
            Object.defineProperty(obj, prop, descriptor);
        });
        return obj;
    }
    async StaticMemberExpression(expr) {
        if (expr.object.type === 'Super')
            return this.interpreter.skipOrThrow(expr.object.type);
        const object = await this.interpreter.evaluateNext(expr.object);
        const value = await object[expr.property];
        return value;
    }
    async ComputedMemberExpression(expr) {
        if (expr.object.type === 'Super')
            return this.interpreter.skipOrThrow(expr.object.type);
        const object = await this.interpreter.evaluateNext(expr.object);
        const value = await object[await this.interpreter.evaluateNext(expr.expression)];
        // if (typeof value === "function") return value.bind(object);
        return value;
    }
    async CallExpression(expr) {
        const _debug = debug.extend('CallExpression');
        if (expr.callee.type === 'Super')
            return this.interpreter.skipOrThrow(expr.callee.type);
        const args = [];
        for (let arg of expr.arguments) {
            if (arg.type === 'SpreadElement') {
                const value = await this.interpreter.evaluateNext(arg.expression);
                args.push(...value);
            }
            else {
                args.push(await this.interpreter.evaluateNext(arg));
            }
        }
        let context = this.interpreter.getCurrentContext();
        let fn = null;
        if (expr.callee.type === 'StaticMemberExpression') {
            context = await this.interpreter.evaluateNext(expr.callee.object);
            fn = context[expr.callee.property];
        }
        else if (expr.callee.type === 'ComputedMemberExpression') {
            context = await this.interpreter.evaluateNext(expr.callee.object);
            fn = context[await this.interpreter.evaluateNext(expr.callee.expression)];
        }
        else {
            fn = await this.interpreter.evaluateNext(expr.callee);
        }
        if (typeof fn === 'function') {
            _debug('calling function');
            const returnValue = await fn.apply(context, args);
            _debug('function completed');
            return returnValue;
        }
        else {
            throw new Error(`Can not execute non-function ${JSON.stringify(expr)}`);
        }
    }
    async AssignmentExpression(expr) {
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
                return (object[property] = value);
            }
            case 'StaticMemberAssignmentTarget': {
                if (expr.binding.object.type === 'ThisExpression')
                    debugger;
                const object = await this.interpreter.evaluateNext(expr.binding.object);
                const property = expr.binding.property;
                _debug(`3: evaluating expression ${expr.expression.type} to assign to ${property}`);
                const value = await this.interpreter.evaluateNext(expr.expression);
                _debug(`4: assigning object property "${property}" new value`);
                return await (object[property] = value);
            }
            case 'ArrayAssignmentTarget':
            case 'ObjectAssignmentTarget':
            default:
                return this.interpreter.skipOrThrow(expr.binding.type);
        }
    }
    async UpdateExpression(expr) {
        switch (expr.operand.type) {
            case 'AssignmentTargetIdentifier': {
                const currentValue = this.interpreter.getVariableValue(expr.operand);
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
    async CompoundAssignmentExpression(expr) {
        const operation = operators_1.compoundAssignmentOperatorMap.get(expr.operator);
        switch (expr.binding.type) {
            case 'AssignmentTargetIdentifier': {
                const currentValue = this.interpreter.getVariableValue(expr.binding);
                return this.interpreter.updateVariableValue(expr.binding, operation(currentValue, await this.interpreter.evaluateNext(expr.expression)));
            }
            case 'ComputedMemberAssignmentTarget': {
                const object = await this.interpreter.evaluateNext(expr.binding.object);
                const property = await this.interpreter.evaluateNext(expr.binding.expression);
                const currentValue = object[property];
                return (object[property] = operation(currentValue, await this.interpreter.evaluateNext(expr.expression)));
            }
            case 'StaticMemberAssignmentTarget': {
                const object = await this.interpreter.evaluateNext(expr.binding.object);
                const property = expr.binding.property;
                const currentValue = object[property];
                return (object[property] = operation(currentValue, await this.interpreter.evaluateNext(expr.expression)));
            }
            default:
                return;
        }
    }
    async LiteralRegExpExpression(expr) {
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
    async TemplateExpression(expr) {
        const parts = [];
        for (let el of expr.elements) {
            if (el.type === 'TemplateElement') {
                parts.push(el.rawValue);
            }
            else {
                parts.push(await this.interpreter.evaluateNext(el));
            }
        }
        return parts.join('');
    }
    async ArrowExpression(expr) {
        const interpreter = this.interpreter;
        return function () {
            return async (...args) => {
                interpreter.pushContext(this);
                for (let i = 0; i < expr.params.items.length; i++) {
                    let param = expr.params.items[i];
                    await interpreter.bindVariable(param, args[i]);
                }
                let returnValue = undefined;
                if (expr.body.type === 'FunctionBody') {
                    const blockResult = await interpreter.evaluateNext(expr.body);
                    returnValue = blockResult.value;
                }
                else {
                    returnValue = await interpreter.evaluateNext(expr.body);
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
        return RuntimeValue_1.RuntimeValue.wrap(expr.value);
    }
    LiteralStringExpression(expr) {
        return RuntimeValue_1.RuntimeValue.wrap(expr.value);
    }
    LiteralBooleanExpression(expr) {
        return RuntimeValue_1.RuntimeValue.wrap(expr.value);
    }
    LiteralInfinityExpression(expr) {
        return RuntimeValue_1.RuntimeValue.wrap(1 / 0);
    }
    LiteralNullExpression(expr) {
        return RuntimeValue_1.RuntimeValue.wrap(null);
    }
    async BinaryExpression(expr) {
        const operation = operators_1.binaryOperatorMap.get(expr.operator);
        return operation(await this.interpreter.evaluateNext(expr.left), await this.interpreter.evaluateNext(expr.right));
    }
    async UnaryExpression(expr) {
        const operation = operators_1.unaryOperatorMap.get(expr.operator);
        if (!operation)
            return this.interpreter.skipOrThrow(`${expr.type} : ${expr.operator}`);
        return operation(await this.interpreter.evaluateNext(expr.operand));
    }
    // TODO move any possible logic here.
    async BreakStatement(...args) { }
    async ContinueStatement(...args) { }
    async EmptyStatement(...args) { }
    // TODO support these nodes
    async WithStatement(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    async SwitchStatementWithDefault(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    async SwitchStatement(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    async LabeledStatement(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    async ForAwaitStatement(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    async DebuggerStatement(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    async NewTargetExpression(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    async AwaitExpression(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    async Super(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    async ClassExpression(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    async YieldExpression(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
    async YieldGeneratorExpression(...args) {
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${arguments[0].type}`);
    }
}
exports.NodeHandler = NodeHandler;
//# sourceMappingURL=node-handler.js.map