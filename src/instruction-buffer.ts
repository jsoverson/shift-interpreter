import {InstructionNode} from './types';
import {Instruction} from './instruction';
import * as codegen from 'shift-printer';
import DEBUG from 'debug';
import {EventEmitter} from 'events';

const debug = DEBUG('shift:interpreter:buffer');

export enum InstructionBufferEventName {
  REQUEST_EXECUTION = 'requestExecution',
  HALT = 'halt',
  CONTINUE = 'continue',
}

export class InstructionBuffer extends EventEmitter {
  buffer: Instruction[] = [];
  numInstructions = 0;
  private isPaused = false;
  private wasPaused = false;

  add(node: InstructionNode): Instruction {
    // debug(`queuing: ${codegen.printTruncated(node).trim()}`);
    const instruction = new Instruction(node, this.numInstructions++);
    this.buffer.push(instruction);
    return instruction;
  }
  step() {
    this.continue({force: true});
  }
  continue(options: {force: boolean} = {force: false}) {
    if (!options.force) {
      if (this.isPaused) {
        // debug('paused, ignoring continue request');
        if (!this.wasPaused) {
          this.emit(InstructionBufferEventName.HALT, this.buffer[0]);
        }
        return;
      } else if (!this.wasPaused) {
        // debug(`triggering next instruction`);
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
  onNext(cb: (instruction: Instruction) => void) {
    this.once(InstructionBufferEventName.REQUEST_EXECUTION, cb);
  }
  awaitExecution(): Promise<Instruction> {
    const promise: Promise<Instruction> = new Promise((resolve, reject) => {
      this.onNext(instruction => {
        // debug(`continuing execution with:${instruction.node.type}: ${codegen.printTruncated(instruction.node).trim()}`);
        resolve(instruction);
      });
    });
    this.continue();
    return promise;
  }
}
