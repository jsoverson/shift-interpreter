"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const shift_scope_1 = __importStar(require("shift-scope"));
const intermediate_types_1 = require("./intermediate-types");
const node_handler_1 = require("./node-handler");
const util_1 = require("./util");
class InterpreterRuntimeError extends Error {
}
exports.InterpreterRuntimeError = InterpreterRuntimeError;
class ReturnValueWithState {
    constructor(value, { didReturn = false, didContinue = false, didBreak = false } = {}) {
        this.didReturn = false;
        this.didBreak = false;
        this.didContinue = false;
        this.value = value;
        this.didContinue = didContinue;
        this.didBreak = didBreak;
        this.didReturn = didReturn;
    }
}
exports.ReturnValueWithState = ReturnValueWithState;
class Interpreter {
    constructor(context = {}, options = {}) {
        this.variableMap = new Map();
        this.argumentsMap = new WeakMap();
        this.currentLoops = [];
        this.contexts = [context];
        this.options = options;
    }
    skipOrThrow(type) {
        if (this.options.skipUnsupported)
            return;
        throw new InterpreterRuntimeError(`Unsupported node ${type}`);
    }
    analyze(script) {
        this.globalScope = shift_scope_1.default(script);
        this.scopeLookup = new shift_scope_1.ScopeLookup(this.globalScope).variableMap;
        this.currentScript = script;
    }
    pushContext(context) {
        this.contexts.push(context);
    }
    popContext() {
        return this.contexts.pop();
    }
    evaluate(script) {
        if (!script) {
            if (!this.currentScript)
                throw new InterpreterRuntimeError('No script to evaluate');
            else
                script = this.currentScript;
        }
        if (script.type === 'Script') {
            this.currentScript = script;
            this.analyze(script);
            return this.evaluateBlock(script).value;
        }
        else if (util_1.isStatement(script)) {
            return this.evaluateStatement(script);
        }
        else {
            return this.evaluateExpression(script);
        }
    }
    evaluateBlock(block) {
        let value;
        let didBreak = false;
        let didContinue = false;
        let didReturn = false;
        // Hoist function declarations.
        const functions = block.statements.filter(s => s.type === 'FunctionDeclaration');
        functions.forEach(fnDecl => {
            this.evaluateStatement(fnDecl);
        });
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
            if (statement.type !== 'FunctionDeclaration') {
                value = this.evaluateStatement(statement);
            }
            if (value instanceof ReturnValueWithState) {
                if (value.didReturn)
                    return value;
            }
            if (statement.type === 'ReturnStatement') {
                didReturn = true;
                break;
            }
        }
        return new ReturnValueWithState(value, { didBreak, didContinue, didReturn });
    }
    evaluateStatement(stmt) {
        if (!this.contexts)
            return;
        const handler = node_handler_1.nodeHandler.get(stmt.type);
        if (handler)
            return handler(this, stmt);
        this.skipOrThrow(stmt.type);
    }
    declareClass(decl) {
        const staticMethods = [];
        const methods = [];
        let constructor = null;
        if (decl.elements.length > 0) {
            decl.elements.forEach(el => {
                if (el.method.type === 'Method') {
                    const intermediateFunction = intermediate_types_1.createFunction(el.method, this);
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
                    this.skipOrThrow(`ClassElement type ${el.method.type}`);
                }
            });
        }
        let Class = class {
        };
        if (decl.super) {
            Class = ((SuperClass = this.evaluateExpression(decl.super)) => {
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
        const variables = this.scopeLookup.get(decl.name);
        variables.forEach((variable) => this.variableMap.set(variable, Class));
        return Class;
    }
    declareFunction(decl) {
        const variables = this.scopeLookup.get(decl.name);
        if (variables.length > 1)
            throw new Error('reproduce this and handle it better');
        const variable = variables[0];
        const fn = intermediate_types_1.createFunction(decl, this);
        this.variableMap.set(variable, fn);
    }
    declareVariables(decl) {
        decl.declarators.forEach(declarator => this.bindVariable(declarator.binding, this.evaluateExpression(declarator.init)));
    }
    bindVariable(binding, init) {
        switch (binding.type) {
            case 'BindingIdentifier':
                {
                    const variables = this.scopeLookup.get(binding);
                    if (variables.length > 1)
                        throw new Error('reproduce this and handle it better');
                    const variable = variables[0];
                    this.variableMap.set(variable, init);
                }
                break;
            case 'ArrayBinding':
                {
                    binding.elements.forEach((el, i) => {
                        if (el)
                            this.bindVariable(el, init[i]);
                    });
                    if (binding.rest)
                        this.skipOrThrow('ArrayBinding->Rest/Spread');
                }
                break;
            case 'ObjectBinding':
                {
                    binding.properties.forEach(prop => {
                        if (prop.type === 'BindingPropertyIdentifier') {
                            const name = prop.binding.name;
                            if (init[name] === undefined && prop.init) {
                                this.bindVariable(prop.binding, this.evaluateExpression(prop.init));
                            }
                            else {
                                this.bindVariable(prop.binding, init[name]);
                            }
                        }
                        else {
                            const name = prop.name.type === 'ComputedPropertyName'
                                ? this.evaluateExpression(prop.name.expression)
                                : prop.name.value;
                            this.bindVariable(prop.binding, init[name]);
                        }
                    });
                    if (binding.rest)
                        this.skipOrThrow('ObjectBinding->Rest/Spread');
                }
                break;
            case 'BindingWithDefault':
                if (init === undefined)
                    this.bindVariable(binding.binding, this.evaluateExpression(binding.init));
                else
                    this.bindVariable(binding.binding, init);
                break;
        }
    }
    updateVariableValue(node, value) {
        const variables = this.scopeLookup.get(node);
        if (variables.length > 1)
            throw new Error('reproduce this and handle it better');
        const variable = variables[0];
        this.variableMap.set(variable, value);
        return value;
    }
    getVariableValue(node) {
        const variables = this.scopeLookup.get(node);
        if (!variables) {
            throw new Error(`${node.type} variable not found. Make sure you are passing a valid Identifier node.`);
        }
        if (variables.length > 1)
            throw new Error('reproduce this and handle it better');
        const variable = variables[0];
        if (this.variableMap.has(variable)) {
            return this.variableMap.get(variable);
        }
        else {
            if (node.name === 'arguments') {
                if (this.argumentsMap.has(this.getCurrentContext())) {
                    return this.argumentsMap.get(this.getCurrentContext());
                }
            }
            for (let i = this.contexts.length - 1; i > -1; i--) {
                if (variable.name in this.contexts[i])
                    return this.contexts[i][variable.name];
            }
            throw new ReferenceError(`${node.name} is not defined`);
        }
    }
    getCurrentContext() {
        return this.contexts[this.contexts.length - 1];
    }
    evaluateExpression(expr) {
        // This might be incorrect behavior ¯\_(ツ)_/¯
        if (expr === null)
            return;
        if (!this.contexts)
            return;
        const handler = node_handler_1.nodeHandler.get(expr.type);
        if (handler)
            return handler(this, expr);
        return this.skipOrThrow(expr.type);
    }
}
exports.Interpreter = Interpreter;
//# sourceMappingURL=interpreter.js.map