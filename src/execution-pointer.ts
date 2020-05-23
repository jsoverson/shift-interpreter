import { FrameNode } from './types';
import { ExecutionFrame } from './execution-frame';
import * as codegen from 'shift-printer';
import DEBUG from 'debug';

const debug = DEBUG('shift:interpreter:frame');

export class ExecutionPointer {
  queue: ExecutionFrame[] = [];
  listeners: ((frame: ExecutionFrame) => void)[] = [];
  numFrames = 0;
  private isPaused = false;

  queueNext(node: FrameNode) {
    debug(`queuing: ${codegen.printTruncated(node).trim()}`);
    const frame = new ExecutionFrame(node, this.numFrames++);
    this.queue.push(frame);
    if (!this.isPaused) this.triggerNext();
  }
  triggerNext() {
    debug(`triggering next frame`);
    if (this.listeners.length > 0) {
      const frame = this.queue.shift();
      if (frame) {
        let listener;
        while ((listener = this.listeners.shift())) {
          listener(frame);
        }
      }
    }
  }
  pause() {
    this.isPaused = true;
  }
  unpause() {
    this.isPaused = false;
    this.triggerNext();
  }
  queueAndWait(node: FrameNode) {
    this.queueNext(node);
    return this.getNext();
  }
  onNext(cb: (frame: ExecutionFrame) => void) {
    this.listeners.push(cb);
  }
  getNext(): Promise<ExecutionFrame> {
    debug('getNext');
    const promise: Promise<ExecutionFrame> = new Promise((resolve, reject) => {
      if (this.queue.length > 0 && !this.isPaused) {
        debug('executing immediately');
        const frame = this.queue.shift();
        if (frame) {
          debug(`${frame.id} (${frame.node.type}): ${codegen.printTruncated(frame.node).trim()}`);
          resolve(frame);
        }
      } else {
        debug('paused, queuing next');
        this.onNext(frame => {
          debug(`evaluating after pause ${frame.node.type}: ${codegen.printTruncated(frame.node).trim()}`);
          resolve(frame);
        });
      }
    });
    if (!this.isPaused) this.triggerNext();
    return promise;
  }
}
