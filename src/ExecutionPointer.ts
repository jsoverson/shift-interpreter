import { FrameNode } from './types';
import { ExecutionFrame } from './ExecutionFrame';
import { debugFrame } from './interpreter';
import * as codegen from 'shift-printer';

export class ExecutionPointer {
  queue: ExecutionFrame[] = [];
  listeners: ((frame: ExecutionFrame) => void)[] = [];
  numFrames = 0;
  queueNext(node: FrameNode) {
    // debugFrame(`queuing: ${codegen.printTerse(node).trim()}`);
    const frame = new ExecutionFrame(node, this.numFrames++);
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
  queueAndWait(node: FrameNode) {
    this.queueNext(node);
    return this.getNext();
  }
  onNext(cb: (frame: ExecutionFrame) => void) {
    this.listeners.push(cb);
  }
  getNext(): Promise<ExecutionFrame> {
    const promise: Promise<ExecutionFrame> = new Promise((resolve, reject) => {
      if (this.queue.length > 0) {
        const frame = this.queue.shift();
        if (frame) {
          debugFrame(`${frame.id} (${frame.node.type}): ${codegen.printTerse(frame.node).trim()}`);
          resolve(frame);
        }
      }
      else
        this.onNext((frame) => {
          debugFrame(`evaluating after pause ${frame.node.type}: ${codegen.printTerse(frame.node).trim()}`);
          resolve(frame);
        });
    });
    this.triggerNext();
    return promise;
  }
}
