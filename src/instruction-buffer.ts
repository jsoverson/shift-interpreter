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
  nextInstruction() {
    return this.buffer.shift();
  }
}
