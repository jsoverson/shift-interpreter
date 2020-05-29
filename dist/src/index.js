"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shift_parser_1 = require("shift-parser");
const interpreter_1 = require("./interpreter");
function interpretSource(source, context = {}) {
    return interpretTree(shift_parser_1.parseScript(source), context);
}
exports.interpretSource = interpretSource;
function interpretTree(tree, context = {}) {
    const interpreter = new interpreter_1.Interpreter();
    interpreter.load(tree);
    interpreter.pushContext(context);
    return interpreter.run();
}
exports.interpretTree = interpretTree;
exports.default = interpretSource;
exports.interpret = interpretSource;
var interpreter_2 = require("./interpreter");
exports.Interpreter = interpreter_2.Interpreter;
var runtime_value_1 = require("./runtime-value");
exports.RuntimeValue = runtime_value_1.RuntimeValue;
//# sourceMappingURL=index.js.map