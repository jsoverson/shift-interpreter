"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_value_1 = require("./runtime-value");
function deconstruct(rv) {
    if (rv instanceof runtime_value_1.RuntimeValue)
        return rv.unwrap();
    else
        return rv;
}
exports.binaryOperatorMap = new Map([
    ['+', (l, r) => l + r],
    ['-', (l, r) => l - r],
    ['/', (l, r) => l / r],
    ['*', (l, r) => l * r],
    ['**', (l, r) => l ** r],
    ['==', (l, r) => l == r],
    ['!=', (l, r) => l != r],
    ['===', (l, r) => l === r],
    ['!==', (l, r) => l !== r],
    ['<', (l, r) => l < r],
    ['<=', (l, r) => l <= r],
    ['>', (l, r) => l > r],
    ['>=', (l, r) => l >= r],
    ['in', (l, r) => l in r],
    ['instanceof', (l, r) => l instanceof r],
    ['<<', (l, r) => l << r],
    ['>>', (l, r) => l >> r],
    ['>>>', (l, r) => l >>> r],
    ['%', (l, r) => l % r],
    [',', (l, r) => r],
    ['||', (l, r) => l || r],
    ['&&', (l, r) => l && r],
    ['|', (l, r) => l | r],
    ['&', (l, r) => l & r],
    ['^', (l, r) => l ^ r],
]);
exports.unaryOperatorMap = new Map([
    ['+', (oper) => +oper],
    ['-', (oper) => -oper],
    ['!', (oper) => !oper],
    ['~', (oper) => ~oper],
    ['typeof', (oper) => typeof oper],
    ['void', (oper) => void oper],
]);
exports.compoundAssignmentOperatorMap = new Map([
    ['+=', (l, r) => l + r],
    ['-=', (l, r) => l - r],
    ['/=', (l, r) => l / r],
    ['*=', (l, r) => l * r],
    ['**=', (l, r) => l ** r],
    ['<<=', (l, r) => l << r],
    ['>>=', (l, r) => l >> r],
    ['>>>=', (l, r) => l >>> r],
    ['%=', (l, r) => l % r],
    ['|=', (l, r) => l | r],
    ['&=', (l, r) => l & r],
    ['^=', (l, r) => l ^ r],
]);
//# sourceMappingURL=operators.js.map