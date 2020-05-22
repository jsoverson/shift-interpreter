"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const codegen = __importStar(require("shift-printer"));
const shift_scope_1 = __importStar(require("shift-scope"));
const errors_1 = require("./errors");
const node_handler_1 = require("./node-handler");
const return_value_1 = require("./return-value");
const util_1 = require("./util");
const debug_1 = __importDefault(require("debug"));
const ExecutionPointer_1 = require("./ExecutionPointer");
const debug = debug_1.default('shift:interpreter');
exports.debugFrame = debug.extend('frame');
class Interpreter {
    constructor(options = {}) {
        this.contexts = [{}];
        this.variableMap = new Map();
        this.pointer = new ExecutionPointer_1.ExecutionPointer;
        this.argumentsMap = new WeakMap();
        this.currentLoops = [];
        this.options = options;
        if (this.options.handler) {
            this.handler = new this.options.handler(this);
        }
        else {
            this.handler = new node_handler_1.NodeHandler(this);
        }
    }
    getNextExecutionPointer() {
        throw new Error("Method not implemented.");
    }
    getExecutionPointer() {
        throw new Error("Method not implemented.");
    }
    print(node) {
        return codegen.prettyPrint(node || this.currentNode);
    }
    skipOrThrow(type) {
        if (this.options.skipUnsupported)
            return;
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${type}`);
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
    async run(passedNode) {
        let nodeToEvaluate = undefined;
        if (passedNode) {
            if (passedNode.type === 'Script') {
                this.analyze(passedNode);
            }
            nodeToEvaluate = passedNode;
        }
        else if (this.currentScript) {
            nodeToEvaluate = this.currentScript;
        }
        if (!this.currentScript) {
            // If we don't have a currentScript (haven't run analyze()) but were passed a node
            // the node must be a Statement or Expression (or bad object) and we shouldn't run
            // it without the user knowing what they are doing.
            if (passedNode)
                throw new errors_1.InterpreterRuntimeError(`Can not evaluate ${passedNode.type} node without analyzing a host program (Script node) first. If you know what you are doing, use .evaluateStatement() or .evaluateExpression() directly.`);
            else
                throw new errors_1.InterpreterRuntimeError('No program to evaluate');
        }
        if (!nodeToEvaluate) {
            throw new errors_1.InterpreterRuntimeError('No program to evaluate');
        }
        try {
            const returnValue = await this.evaluateNext(nodeToEvaluate);
            const result = (returnValue instanceof return_value_1.ReturnValueWithState) ? returnValue.value : returnValue;
            debug(`completing run with result: ${result}`);
            return result;
        }
        catch (e) {
            const statementSrc = codegen.printSummary(this.currentStatement);
            const currentNodeSrc = codegen.printSummary(this.currentNode);
            console.log(statementSrc.replace(currentNodeSrc, `👉👉👉${chalk_1.default.red(currentNodeSrc)}`));
            throw e;
        }
    }
    async evaluateFrame(frame) {
        if (util_1.isBlockType(frame.node)) {
            return this.evaluateBlock(frame.node);
        }
        else if (util_1.isStatement(frame.node)) {
            return this.evaluateStatement(frame.node);
        }
        else {
            return this.evaluateExpression(frame.node);
        }
    }
    runToFirstError(passedNode) {
        try {
            return this.run(passedNode);
        }
        catch {
        }
    }
    step() {
        throw new Error("Method not implemented.");
    }
    async evaluateBlock(block) {
        let value;
        let didBreak = false;
        let didContinue = false;
        let didReturn = false;
        const _debug = debug.extend('evaluateBlock');
        _debug(`evaluating ${block.type} statements`);
        // Hoist function declarations.
        const functions = block.statements.filter(s => s.type === 'FunctionDeclaration');
        for (let fnDecl of functions) {
            await this.evaluateNext(fnDecl);
        }
        const vars = block.statements
            .filter((stmt => stmt.type === 'VariableDeclarationStatement'))
            .filter((decl) => decl.declaration.kind === 'var');
        for (let varDecl of vars) {
            await this.hoistVars(varDecl);
        }
        for (let i = 0; i < block.statements.length; i++) {
            const statement = block.statements[i];
            if (statement.type === 'BreakStatement') {
                _debug(`break found in block`);
                didBreak = true;
                break;
            }
            if (statement.type === 'ContinueStatement') {
                _debug(`continue found in block`);
                didContinue = true;
                break;
            }
            // skip over functions we've already declared above
            if (statement.type !== 'FunctionDeclaration') {
                _debug(`Evaluating next ${statement.type} in ${block.type}`);
                value = await this.evaluateNext(statement);
                _debug(`${block.type} statement ${statement.type} completed`);
            }
            if (value instanceof return_value_1.ReturnValueWithState) {
                if (value.didReturn) {
                    _debug(`returning from block with value: ${value}`);
                    return value;
                }
            }
            if (statement.type === 'ReturnStatement') {
                _debug(`return found in block`);
                didReturn = true;
                break;
            }
        }
        _debug(`completed ${block.type}, returning with: ${value}`);
        return new return_value_1.ReturnValueWithState(value, { didBreak, didContinue, didReturn });
    }
    async hoistVars(varDecl) {
        for (let declarator of varDecl.declaration.declarators) {
            await this.bindVariable(declarator.binding, undefined);
        }
    }
    evaluateStatement(stmt) {
        if (!this.contexts)
            return;
        this.currentNode = stmt;
        this.currentStatement = stmt;
        return this.handler[stmt.type](stmt);
    }
    async declareVariables(decl) {
        for (let declarator of decl.declarators) {
            this.currentNode = declarator;
            await this.handler.VariableDeclarator(declarator);
        }
    }
    async createFunction(fn) {
        const _debug = debug.extend('createFunction');
        let name = undefined;
        if (fn.name) {
            switch (fn.name.type) {
                case 'BindingIdentifier':
                    name = fn.name.name;
                    break;
                case 'ComputedPropertyName':
                    name = await this.evaluateNext(fn.name.expression);
                    break;
                case 'StaticPropertyName':
                    name = fn.name.value;
            }
        }
        _debug(`creating intermediary function ${name}`);
        const interpreter = this;
        const fnDebug = debug.extend('function');
        if (name) {
            return ({ [name]: async function (...args) {
                    fnDebug(`calling intermediary function ${name}()`);
                    interpreter.pushContext(this);
                    interpreter.argumentsMap.set(this, arguments);
                    if (fn.type === 'Getter') {
                        // TODO need anything here?
                    }
                    else if (fn.type === 'Setter') {
                        fnDebug(`setter: binding passed parameter`);
                        await interpreter.bindVariable(fn.param, args[0]);
                    }
                    else {
                        for (let i = 0; i < fn.params.items.length; i++) {
                            let param = fn.params.items[i];
                            fnDebug(`binding function argument ${i + 1}`);
                            await interpreter.bindVariable(param, args[i]);
                        }
                    }
                    fnDebug('evaluating function body');
                    const blockResult = await interpreter.evaluateNext(fn.body);
                    fnDebug('completed evaluating function body');
                    interpreter.popContext();
                    return blockResult.value;
                } })[name];
        }
        else {
            return async function (...args) {
                fnDebug(`calling intermediary function ${name}()`);
                interpreter.pushContext(this);
                interpreter.argumentsMap.set(this, arguments);
                if (fn.type === 'Getter') {
                    // TODO need anything here?
                }
                else if (fn.type === 'Setter') {
                    fnDebug(`binding passed setter value`);
                    await interpreter.bindVariable(fn.param, args[0]);
                }
                else {
                    for (let i = 0; i < fn.params.items.length; i++) {
                        let param = fn.params.items[i];
                        fnDebug(`binding function argument ${i + 1}`);
                        await interpreter.bindVariable(param, args[i]);
                    }
                }
                fnDebug('evaluating function body');
                const blockResult = await interpreter.evaluateNext(fn.body);
                interpreter.popContext();
                return blockResult.value;
            };
        }
    }
    async bindVariable(binding, init) {
        const _debug = debug.extend('bindVariable');
        _debug(`${binding.type} => ${init}`);
        switch (binding.type) {
            case 'BindingIdentifier':
                {
                    const variables = this.scopeLookup.get(binding);
                    if (variables.length > 1)
                        throw new Error('reproduce this and handle it better');
                    const variable = variables[0];
                    _debug(`binding ${binding.name} to ${init}`);
                    this.variableMap.set(variable, init);
                }
                break;
            case 'ArrayBinding':
                {
                    for (let i = 0; i < binding.elements.length; i++) {
                        const el = binding.elements[i];
                        if (el)
                            await this.bindVariable(el, init[i]);
                    }
                    if (binding.rest)
                        this.skipOrThrow('ArrayBinding->Rest/Spread');
                }
                break;
            case 'ObjectBinding':
                {
                    for (let i = 0; i < binding.properties.length; i++) {
                        const prop = binding.properties[i];
                        if (prop.type === 'BindingPropertyIdentifier') {
                            const name = prop.binding.name;
                            if (init[name] === undefined && prop.init) {
                                await this.bindVariable(prop.binding, await this.evaluateNext(prop.init));
                            }
                            else {
                                await this.bindVariable(prop.binding, init[name]);
                            }
                        }
                        else {
                            const name = prop.name.type === 'ComputedPropertyName'
                                ? await this.evaluateNext(prop.name.expression)
                                : prop.name.value;
                            await this.bindVariable(prop.binding, init[name]);
                        }
                    }
                    if (binding.rest)
                        this.skipOrThrow('ObjectBinding->Rest/Spread');
                }
                break;
            case 'BindingWithDefault':
                if (init === undefined) {
                    _debug(`evaluating default for undefined argument`);
                    const defaults = await this.evaluateNext(binding.init);
                    _debug(`binding default`);
                    await this.bindVariable(binding.binding, defaults);
                }
                else {
                    await this.bindVariable(binding.binding, init);
                }
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
    async evaluateNext(node) {
        if (node === null) {
            return null;
        }
        else {
            const frame = await this.pointer.queueAndWait(node);
            return this.evaluateFrame(frame);
        }
    }
    evaluateExpression(expr) {
        // This might be incorrect behavior ¯\_(ツ)_/¯
        if (expr === null)
            return;
        if (!this.contexts)
            return;
        this.currentNode = expr;
        return this.handler[expr.type](expr);
    }
}
exports.Interpreter = Interpreter;
//# sourceMappingURL=interpreter.js.map