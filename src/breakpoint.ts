import { Node } from "shift-ast";
import { Interpreter } from "./interpreter";

export abstract class Breakpoint {
  abstract test(interpreter: Interpreter): boolean;
}

export class NodeBreakpoint implements Breakpoint {
  node: Node;
  constructor(node:Node) {
    this.node = node;
  }
  test(interpreter: Interpreter) {
    return interpreter.nextInstruction.node === this.node;
  }
}

