import { FrameNode } from './types';

export class ExecutionFrame {
  node: FrameNode;
  id: number;
  constructor(node: FrameNode, id: number) {
    this.node = node;
    this.id = id;
  }
}
