"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shift_parser_1 = require("shift-parser");
const interpreter_1 = require("./interpreter");
function interpretSource(source, context = {}) {
    return interpretTree(shift_parser_1.parseScript(source), context);
}
exports.interpretSource = interpretSource;
function interpretTree(tree, context = {}) {
    const interpreter = new interpreter_1.Interpreter(context);
    return interpreter.evaluate(tree);
}
exports.interpretTree = interpretTree;
exports.interpret = interpretSource;
var interpreter_2 = require("./interpreter");
exports.Interpreter = interpreter_2.Interpreter;
exports.ReturnValueWithState = interpreter_2.ReturnValueWithState;
//# sourceMappingURL=index.js.map