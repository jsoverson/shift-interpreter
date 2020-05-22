"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=util.js.map