"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isStatement(node) {
    return node.type.match(/Statement/) || node.type.match('Declaration') ? true : false;
}
exports.isStatement = isStatement;
//# sourceMappingURL=util.js.map