"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Breakpoint {
}
exports.Breakpoint = Breakpoint;
class NodeBreakpoint {
    constructor(node) {
        this.node = node;
    }
    test(interpreter) {
        return interpreter.nextInstruction.node === this.node;
    }
}
exports.NodeBreakpoint = NodeBreakpoint;
//# sourceMappingURL=breakpoint.js.map