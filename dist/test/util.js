"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const shift_parser_1 = require("shift-parser");
const interpreter_1 = require("../src/interpreter");
function assertResult(result) {
    const message = result.expectedError ?
        `${result.src}: Actual "${result.actualError.message}", Expected "${result.expectedError.message}"` :
        `${result.src}: Actual ${JSON.stringify(result.actual)}, Expected ${JSON.stringify(result.expected)}`;
    chai_1.expect(result.success).to.equal(true, message);
}
exports.assertResult = assertResult;
function assertError(src, error) {
    const interpreter = new interpreter_1.Interpreter();
    let expected = "No error", actual = "No error";
    try {
        eval(src);
    }
    catch (e) {
        expected = e.message;
    }
    try {
        interpreter.evaluate(shift_parser_1.parseScript(src));
    }
    catch (e) {
        actual = e.message;
    }
    chai_1.expect(actual).to.equal(expected);
}
exports.assertError = assertError;
function compare(src, context) {
    const interpreter = new interpreter_1.Interpreter(context);
    let expected, expectedError;
    try {
        expected = eval(src);
    }
    catch (e) {
        expectedError = e;
    }
    let actual, actualError;
    try {
        actual = interpreter.evaluate(shift_parser_1.parseScript(src));
    }
    catch (e) {
        actualError = e;
    }
    let success = false;
    if (Number.isNaN(expected)) {
        success = Number.isNaN(actual);
    }
    else if (expectedError) {
        if (!actualError) {
            actualError = { message: '<<Did not throw an error>>' };
            success = false;
        }
        else {
            success = actualError.message === expectedError.message;
        }
    }
    else {
        if (actualError)
            console.log(actualError);
        success = expected === actual;
    }
    return {
        actual,
        actualError,
        expected,
        expectedError,
        src,
        success
    };
}
exports.compare = compare;
//# sourceMappingURL=util.js.map