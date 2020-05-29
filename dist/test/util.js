"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const shift_parser_1 = require("shift-parser");
const interpreter_1 = require("../src/interpreter");
const debug_1 = __importDefault(require("debug"));
const src_1 = require("../src");
const debug = debug_1.default('shift:interpreter:test');
const evaluate = require('./nostrict-eval.js').eval;
function assertResult(result) {
    const message = result.expectedError ?
        `${result.src}: Actual "${result.actualError.message}", Expected "${result.expectedError.message}"` :
        `${result.src}: Actual ${JSON.stringify(result.actual)}, Expected ${JSON.stringify(result.expected)}`;
    chai_1.expect(result.success).to.equal(true, message);
}
exports.assertResult = assertResult;
function assertError(src, error) {
    debug(`assertError(\`${src}\`)`);
    const interpreter = new interpreter_1.Interpreter();
    let expected = "No error", actual = "No error";
    try {
        evaluate(src);
    }
    catch (e) {
        expected = e.message;
    }
    try {
        interpreter.run(shift_parser_1.parseScript(src));
    }
    catch (e) {
        actual = e.message;
    }
    if (actual)
        debug(`Interpreter error: ${actual}`);
    if (expected)
        debug(`Native error: ${expected}`);
    chai_1.expect(actual).to.equal(expected);
}
exports.assertError = assertError;
async function compare(src, context) {
    const interpreter = new interpreter_1.Interpreter();
    if (context)
        interpreter.pushContext(context);
    let nativeExpectedValue, nativeExpectedError;
    debug(`compare(\`${src}\`)`);
    try {
        nativeExpectedValue = evaluate(src);
    }
    catch (e) {
        nativeExpectedError = e;
    }
    let interpreterActualValue, interpreterActualError;
    try {
        interpreter.load(shift_parser_1.parseScript(src));
        // const result = await interpreter.stepInteractive();
        const result = await interpreter.run();
        interpreterActualValue = src_1.RuntimeValue.unwrap(result);
    }
    catch (e) {
        interpreterActualError = e;
    }
    debug(`== Interpreter result: ${interpreterActualValue}`);
    debug(`== Native result     : ${nativeExpectedValue}`);
    if (interpreterActualError)
        debug(`!! Interpreter error: ${interpreterActualError.message}`);
    else
        debug(`!! Interpreter error: <none>`);
    if (nativeExpectedError)
        debug(`!! Native error     : ${nativeExpectedError.message}`);
    else
        debug(`!! Native error     : <none>`);
    let success = false;
    if (Number.isNaN(nativeExpectedValue)) {
        success = Number.isNaN(interpreterActualValue);
        debug(`Interpreter produced NaN, Native produced ${interpreterActualValue}`);
    }
    else if (nativeExpectedError) {
        if (!interpreterActualError) {
            debug(`Failure: Native produced error, Interpreter did not`);
            interpreterActualError = { message: '<<Did not throw an error>>' };
            success = false;
        }
        else {
            success = interpreterActualError.message === nativeExpectedError.message;
            debug(`Both produced errors (same===${success})`);
        }
    }
    else {
        if (interpreterActualError) {
            debug(`Failure: Interpreter produced error, Native did not`);
            console.log(interpreterActualError);
            success = false;
        }
        else {
            success = nativeExpectedValue === interpreterActualValue;
        }
    }
    return {
        actual: interpreterActualValue,
        actualError: interpreterActualError,
        expected: nativeExpectedValue,
        expectedError: nativeExpectedError,
        src,
        success
    };
}
exports.compare = compare;
//# sourceMappingURL=util.js.map