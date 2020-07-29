import { InstructionNode } from './types';

export enum InstructionBufferEventName {
  REQUEST_EXECUTION = 'requestExecution',
  HALT = 'halt',
  CONTINUE = 'continue',
}

export class Instruction {
  node: InstructionNode;
  id: number;
  result: any;
  constructor(node: InstructionNode, id: number) {
    this.node = node;
    this.id = id;
  }
}

export class InstructionBuffer {
  buffer: Instruction[] = [];
  numInstructions = 0;
  add(node: InstructionNode): Instruction {
    const instruction = new Instruction(node, this.numInstructions++);
    this.buffer.push(instruction);
    return instruction;
  }
  nextInstruction() {
    return this.buffer.shift();
  }
}
