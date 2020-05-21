import { Interpreter } from "../../src/interpreter";
import { parseScript } from "shift-parser";



// function interpret(src: string) {
//   const interpreter = new Interpreter({}, {handler});
//   const value = interpreter.evaluate(parseScript(src));
//   return {interpreter, value};
// }

// describe.only("function purity testing", () => {
//   it("should track calls", () => {
//     const {interpreter, value} = interpret(`function a(){return 2}`);
//     console.log(value);

//   });
// });
