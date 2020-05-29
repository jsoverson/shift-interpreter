import {InstructionNode} from './types';

export class Instruction {
  node: InstructionNode;
  id: number;
  result: any;
  constructor(node: InstructionNode, id: number) {
    this.node = node;
    this.id = id;
  }
}
