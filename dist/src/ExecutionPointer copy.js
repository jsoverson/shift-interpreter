"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ExecutionFrame_1 = require("./ExecutionFrame");
const interpreter_1 = require("./interpreter");
const codegen = __importStar(require("shift-printer"));
class ExecutionPointer {
    constructor() {
        this.queue = [];
        this.listeners = [];
        this.numFrames = 0;
    }
    queueNext(node) {
        // debugFrame(`queuing: ${codegen.printTerse(node).trim()}`);
        const frame = new ExecutionFrame_1.ExecutionFrame(node, this.numFrames++);
        this.queue.push(frame);
        this.triggerNext();
    }
    triggerNext() {
        if (this.listeners.length > 0) {
            const frame = this.queue.shift();
            if (frame) {
                let listener;
                while (listener = this.listeners.shift()) {
                    listener(frame);
                }
            }
        }
    }
    queueAndWait(node) {
        this.queueNext(node);
        return this.getNext();
    }
    onNext(cb) {
        this.listeners.push(cb);
    }
    getNext() {
        const promise = new Promise((resolve, reject) => {
            if (this.queue.length > 0) {
                const frame = this.queue.shift();
                if (frame) {
                    interpreter_1.debugFrame(`${frame.id} (${frame.node.type}): ${codegen.printTerse(frame.node).trim()}`);
                    resolve(frame);
                }
            }
            else
                this.onNext((frame) => {
                    interpreter_1.debugFrame(`evaluating after pause ${frame.node.type}: ${codegen.printTerse(frame.node).trim()}`);
                    resolve(frame);
                });
        });
        this.triggerNext();
        return promise;
    }
}
exports.ExecutionPointer = ExecutionPointer;
//# sourceMappingURL=ExecutionPointer copy.js.map