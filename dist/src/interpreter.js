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
const shift_ast_1 = require("shift-ast");
const codegen = __importStar(require("shift-printer"));
const shift_scope_1 = __importStar(require("shift-scope"));
const errors_1 = require("./errors");
const node_handler_1 = require("./node-handler");
const util_1 = require("./util");
const debug_1 = __importDefault(require("debug"));
const instruction_1 = require("./instruction");
const instruction_buffer_1 = require("./instruction-buffer");
const runtime_value_1 = require("./runtime-value");
const events_1 = require("events");
const util_2 = require("util");
const breakpoint_1 = require("./breakpoint");
const waterfall_1 = require("./waterfall");
const debug = debug_1.default('shift:interpreter');
var InterpreterEventName;
(function (InterpreterEventName) {
    InterpreterEventName["COMPLETE"] = "complete";
    InterpreterEventName["CONTINUE"] = "continue";
    InterpreterEventName["BREAK"] = "break";
})(InterpreterEventName = exports.InterpreterEventName || (exports.InterpreterEventName = {}));
class InterpreterEvent {
}
exports.InterpreterEvent = InterpreterEvent;
InterpreterEvent.type = InterpreterEventName;
class InterpreterCompleteEvent extends InterpreterEvent {
    constructor(result) {
        super();
        this.result = result;
    }
}
exports.InterpreterCompleteEvent = InterpreterCompleteEvent;
class InterpreterContinueEvent extends InterpreterEvent {
    constructor(instruction) {
        super();
        this.instruction = instruction;
    }
}
exports.InterpreterContinueEvent = InterpreterContinueEvent;
class InterpreterBreakEvent extends InterpreterEvent {
    constructor(instruction) {
        super();
        this.instruction = instruction;
    }
}
exports.InterpreterBreakEvent = InterpreterBreakEvent;
class Interpreter extends events_1.EventEmitter {
    constructor(options = {}) {
        super();
        this.contexts = [{}];
        this.variableMap = new Map();
        this.loadedScript = new shift_ast_1.Script({ directives: [], statements: [] });
        this.pointer = new instruction_buffer_1.InstructionBuffer();
        this.breakpoints = [];
        this.argumentsMap = new WeakMap();
        this.currentLoops = [];
        this.lastStatement = new shift_ast_1.EmptyStatement();
        this.lastInstruction = new instruction_1.Instruction(new shift_ast_1.EmptyStatement(), -1);
        this.nextInstruction = new instruction_1.Instruction(new shift_ast_1.EmptyStatement(), -1);
        this.hasStarted = false;
        this.options = options;
        if (this.options.handler) {
            this.handler = new this.options.handler(this);
        }
        else {
            this.handler = new node_handler_1.NodeHandler(this);
        }
        this.pointer.on(instruction_buffer_1.InstructionBufferEventName.CONTINUE, (nextInstruction) => {
            this.emit(InterpreterEventName.CONTINUE, new InterpreterContinueEvent(nextInstruction));
        });
        this.pointer.on(instruction_buffer_1.InstructionBufferEventName.HALT, (nextInstruction) => {
            this.emit(InterpreterEventName.BREAK, new InterpreterBreakEvent(nextInstruction));
        });
    }
    print(node) {
        return codegen.prettyPrint(node || this.lastInstruction.node);
    }
    // debug(state: boolean = true) {
    //   debug.enabled = true;
    // }
    logNode(node) {
        codegen.log(node);
    }
    codegen(node) {
        codegen.printTruncated(node);
    }
    skipOrThrow(type) {
        if (this.options.skipUnsupported)
            return;
        throw new errors_1.InterpreterRuntimeError(`Unsupported node ${type}`);
    }
    load(script) {
        debug('loading script');
        this.globalScope = shift_scope_1.default(script);
        this.scopeLookup = new shift_scope_1.ScopeLookup(this.globalScope).variableMap;
        this.loadedScript = script;
        this.hasStarted = false;
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
                this.load(passedNode);
            }
            nodeToEvaluate = passedNode;
        }
        else if (this.loadedScript) {
            nodeToEvaluate = this.loadedScript;
        }
        if (!this.loadedScript) {
            // If we don't have a currentScript (haven't run load()) but were passed a node
            // the node must be a Statement or Expression (or bad object) and we shouldn't run
            // it without the user knowing what they are doing.
            if (passedNode)
                throw new errors_1.InterpreterRuntimeError(`Can not evaluate ${passedNode.type} node without loading a program (Script node) first. If you know what you are doing, use .evaluateStatement() or .evaluateExpression() directly.`);
            else
                throw new errors_1.InterpreterRuntimeError('No program to evaluate');
        }
        if (!nodeToEvaluate) {
            throw new errors_1.InterpreterRuntimeError('No program to evaluate');
        }
        debug('starting execution');
        this.hasStarted = true;
        const whenBroken = this.onBreak();
        let programResult = null;
        try {
            const rootEvaluation = this.evaluateNext(nodeToEvaluate).then(result => programResult = result);
            const returnValue = await Promise.race([
                whenBroken.then((evt) => runtime_value_1.RuntimeValue.wrap(this.lastInstruction.result)),
                rootEvaluation.then((value) => {
                    this.emit(InterpreterEventName.COMPLETE, new InterpreterCompleteEvent(value));
                    return value;
                })
            ]);
            debug(`completed execution with result: ${returnValue.unwrap()}`);
            return returnValue;
        }
        catch (e) {
            this.handleError(e);
            throw e;
        }
    }
    handleError(e) {
        debug(`Error during execution`);
        const statementSrc = codegen.printSummary(this.lastStatement);
        const nodeSrc = codegen.printSummary(this.lastInstruction.node);
        console.log(statementSrc.replace(nodeSrc, `👉👉👉${chalk_1.default.red(nodeSrc)}`));
    }
    onComplete() {
        return new Promise((res, rej) => {
            this.once(InterpreterEvent.type.COMPLETE, res);
        });
    }
    onContinue() {
        return new Promise((res, rej) => {
            this.once(InterpreterEvent.type.CONTINUE, res);
        });
    }
    onBreak() {
        return new Promise((res, rej) => {
            this.once(InterpreterEvent.type.BREAK, res);
        });
    }
    onHalt() {
        return Promise.race([
            this.onBreak(),
            this.onComplete()
        ]);
    }
    runToFirstError(passedNode) {
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
        const readline = util_1.createReadlineInterface();
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
                    if (lastInstruction && lastInstruction.result instanceof runtime_value_1.RuntimeValue) {
                        const result = lastInstruction.result.unwrap();
                        if (util_1.isIntermediaryFunction(result)) {
                            console.log(`Result: interpreter intermediary function ${result.name}`);
                        }
                        else {
                            console.log(`Result:`);
                            console.log(util_2.inspect(result));
                        }
                    }
                    if (nextInstruction) {
                        console.log(`next: ${codegen.printSummary(nextInstruction.node)}`);
                    }
                    else if (this.loadedScript) {
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
    breakAtNode(node) {
        this.breakpoints.push(new breakpoint_1.NodeBreakpoint(node));
    }
    async evaluateInstruction(instruction) {
        this.lastInstruction = instruction;
        let promise;
        if (util_1.isBlockType(instruction.node)) {
            promise = this.evaluateBlock(instruction.node);
        }
        else if (util_1.isStatement(instruction.node)) {
            promise = this.evaluateStatement(instruction.node);
        }
        else if (instruction.node.type === 'VariableDeclarator') {
            promise = this.handler.VariableDeclarator(instruction.node);
        }
        else {
            promise = this.evaluateExpression(instruction.node);
        }
        const result = runtime_value_1.RuntimeValue.wrap(await promise);
        instruction.result = result;
        return result;
    }
    async evaluateNext(node) {
        if (!this.contexts)
            throw new Error('No contexts defined');
        if (node === null) {
            return Promise.resolve(new runtime_value_1.RuntimeValue(undefined));
        }
        else {
            const nextInstruction = this.pointer.add(node);
            this.nextInstruction = nextInstruction;
            const triggeredBreaks = this.breakpoints.filter((bp) => bp.test(this));
            if (triggeredBreaks.length > 0) {
                debug('breakpoint hit');
                this.pause();
            }
            const instruction = await this.pointer.awaitExecution();
            debug(`evaluating instruction (${this.lastInstruction.node.type}->${node.type})`);
            try {
                return this.evaluateInstruction(instruction);
            }
            catch (e) {
                this.handleError(e);
                throw e;
            }
        }
    }
    evaluateExpression(expr) {
        if (expr === null)
            return;
        return this.handler[expr.type](expr);
    }
    evaluateStatement(stmt) {
        if (!this.contexts)
            return;
        this.lastStatement = stmt;
        return this.handler[stmt.type](stmt);
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
        if (functions.length)
            _debug(`hoisting ${functions.length} functions in ${block.type}`);
        for (let fnDecl of functions) {
            await this.evaluateNext(fnDecl);
        }
        const vars = block.statements
            .filter((stmt => stmt.type === 'VariableDeclarationStatement'))
            .filter((decl) => decl.declaration.kind === 'var');
        if (vars.length)
            _debug(`hoisting ${vars.length} vars in ${block.type}`);
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
            if (value && value.didReturn) {
                _debug(`returning from block with value: ${value}`);
                return value;
            }
            if (statement.type === 'ReturnStatement') {
                _debug(`return found in block`);
                didReturn = true;
                break;
            }
        }
        _debug(`completed ${block.type}, returning with: ${value}`);
        return new runtime_value_1.RuntimeValue(value ? value.unwrap() : undefined, { didBreak, didContinue, didReturn });
    }
    async hoistVars(varDecl) {
        for (let declarator of varDecl.declaration.declarators) {
            await this.bindVariable(declarator.binding, runtime_value_1.RuntimeValue.wrap(undefined));
        }
    }
    async declareVariables(decl) {
        for (let declarator of decl.declarators) {
            await this.evaluateNext(declarator);
        }
    }
    async createFunction(node) {
        const _debug = debug.extend('createFunction');
        let name = undefined;
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
        let fn;
        // anonymous functions have an empty string as the name
        if (!name)
            name = '';
        // creating a function like this, i.e. { someName: function(){} )
        // allows us to create a named function by inferring the name from the property value.
        fn = {
            [name]: function (...args) {
                fnDebug(`calling intermediary ${node.type} ${name}`);
                interpreter.pushContext(this);
                interpreter.argumentsMap.set(this, arguments);
                function bindParams() {
                    if (node.type === 'Getter') {
                        return Promise.resolve();
                    }
                    else if (node.type === 'Setter') {
                        fnDebug(`setter: binding passed parameter`);
                        return interpreter.bindVariable(node.param, args[0]);
                    }
                    else {
                        return waterfall_1.waterfallMap(node.params.items, (el, i) => {
                            fnDebug(`binding function argument ${i + 1}`);
                            return interpreter.bindVariable(el, args[i]);
                        });
                    }
                }
                // Track https://github.com/microsoft/TypeScript/issues/36307 PR: https://github.com/microsoft/TypeScript/pull/31023
                //@ts-ignore
                const interpreterPromise = bindParams().then(() => {
                    fnDebug('evaluating function body');
                }).then(() => {
                    return interpreter.evaluateNext(node.body);
                }).then((blockResult) => {
                    fnDebug('completed evaluating function body');
                    interpreter.popContext();
                    return blockResult;
                });
                if (new.target) {
                    return interpreterPromise.then((result) => {
                        if (result.didReturn && typeof result.value === "object")
                            return result.value;
                        else
                            return this;
                    });
                }
                else {
                    return interpreterPromise.then((result) => result.value);
                }
            }
        }[name];
        return Object.assign(fn, { _interp: true });
    }
    async bindVariable(binding, init) {
        const _debug = debug.extend('bindVariable');
        _debug(`${binding.type} => ${init}`);
        init = runtime_value_1.RuntimeValue.wrap(init);
        const rawInitValue = runtime_value_1.RuntimeValue.unwrap(init);
        switch (binding.type) {
            case 'BindingIdentifier':
                {
                    const variables = this.scopeLookup.get(binding);
                    if (variables.length > 1)
                        throw new Error('reproduce this and handle it better');
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
                        if (el)
                            await this.bindVariable(el, runtime_value_1.RuntimeValue.wrap(indexElement));
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
                            if (rawInitValue[name] === undefined && prop.init) {
                                await this.bindVariable(prop.binding, await this.evaluateNext(prop.init));
                            }
                            else {
                                await this.bindVariable(prop.binding, runtime_value_1.RuntimeValue.wrap(rawInitValue[name]));
                            }
                        }
                        else {
                            const name = prop.name.type === 'ComputedPropertyName'
                                ? (await this.evaluateNext(prop.name.expression)).unwrap()
                                : prop.name.value;
                            await this.bindVariable(prop.binding, runtime_value_1.RuntimeValue.wrap(rawInitValue[name]));
                        }
                    }
                    if (binding.rest)
                        this.skipOrThrow('ObjectBinding->Rest/Spread');
                }
                break;
            case 'BindingWithDefault':
                if (rawInitValue === undefined) {
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
        this.variableMap.set(variable, runtime_value_1.RuntimeValue.wrap(value));
        return value;
    }
    getRuntimeValue(node) {
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
            return runtime_value_1.RuntimeValue.wrap(value);
        }
        else {
            if (node.name === 'arguments') {
                if (this.argumentsMap.has(this.getCurrentContext())) {
                    return this.argumentsMap.get(this.getCurrentContext());
                }
            }
            for (let i = this.contexts.length - 1; i > -1; i--) {
                if (variable.name in this.contexts[i]) {
                    const value = this.contexts[i][variable.name];
                    return runtime_value_1.RuntimeValue.wrap(value);
                }
            }
            throw new ReferenceError(`${node.name} is not defined`);
        }
    }
    getCurrentContext() {
        return this.contexts[this.contexts.length - 1];
    }
}
exports.Interpreter = Interpreter;
//# sourceMappingURL=interpreter.js.map