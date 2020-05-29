"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const instruction_1 = require("./instruction");
const codegen = __importStar(require("shift-printer"));
const debug_1 = __importDefault(require("debug"));
const events_1 = require("events");
const debug = debug_1.default('shift:interpreter:buffer');
var InstructionBufferEventName;
(function (InstructionBufferEventName) {
    InstructionBufferEventName["REQUEST_EXECUTION"] = "requestExecution";
    InstructionBufferEventName["HALT"] = "halt";
    InstructionBufferEventName["CONTINUE"] = "continue";
})(InstructionBufferEventName = exports.InstructionBufferEventName || (exports.InstructionBufferEventName = {}));
class InstructionBuffer extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.buffer = [];
        this.numInstructions = 0;
        this.isPaused = false;
        this.wasPaused = false;
    }
    add(node) {
        debug(`queuing: ${codegen.printTruncated(node).trim()}`);
        const instruction = new instruction_1.Instruction(node, this.numInstructions++);
        this.buffer.push(instruction);
        return instruction;
    }
    step() {
        this.continue({ force: true });
    }
    continue(options = { force: false }) {
        if (!options.force) {
            if (this.isPaused) {
                debug('paused, ignoring continue request');
                if (!this.wasPaused) {
                    this.emit(InstructionBufferEventName.HALT, this.buffer[0]);
                }
                return;
            }
            else if (!this.wasPaused) {
                debug(`triggering next instruction`);
                this.emit(InstructionBufferEventName.CONTINUE, this.buffer[0]);
            }
        }
        if (this.listenerCount(InstructionBufferEventName.REQUEST_EXECUTION) > 0) {
            const instruction = this.buffer.shift();
            if (instruction) {
                this.emit(InstructionBufferEventName.REQUEST_EXECUTION, instruction);
            }
        }
    }
    pause() {
        this.isPaused = true;
    }
    unpause() {
        this.isPaused = false;
        this.continue();
    }
    onNext(cb) {
        this.once(InstructionBufferEventName.REQUEST_EXECUTION, cb);
    }
    awaitExecution() {
        const promise = new Promise((resolve, reject) => {
            this.onNext(instruction => {
                debug(`continuing execution with:${instruction.node.type}: ${codegen.printTruncated(instruction.node).trim()}`);
                resolve(instruction);
            });
        });
        this.continue();
        return promise;
    }
}
exports.InstructionBuffer = InstructionBuffer;
//# sourceMappingURL=instruction-buffer.js.map