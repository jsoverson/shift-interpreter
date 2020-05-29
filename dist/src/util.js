"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = __importDefault(require("readline"));
function isStatement(node) {
    return node.type.match(/Statement/) || node.type.match('Declaration') ? true : false;
}
exports.isStatement = isStatement;
function isBlockType(node) {
    switch (node.type) {
        case 'Script':
        case 'FunctionBody':
        case 'Block':
            return true;
        default:
            return false;
    }
}
exports.isBlockType = isBlockType;
function isIntermediaryFunction(fn) {
    //@ts-ignore
    return typeof fn === 'function' && !!fn._interp;
}
exports.isIntermediaryFunction = isIntermediaryFunction;
function isGetterInternal(obj, prop) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    if (!descriptor)
        return false;
    return descriptor.get && isIntermediaryFunction(descriptor.get);
}
exports.isGetterInternal = isGetterInternal;
function createReadlineInterface() {
    const readline = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return (question) => {
        return new Promise(resolve => {
            readline.question(question, resolve);
        });
    };
}
exports.createReadlineInterface = createReadlineInterface;
function toString(obj) {
    return obj.toString ? obj.toString() : '' + obj;
}
exports.toString = toString;
//# sourceMappingURL=util.js.map