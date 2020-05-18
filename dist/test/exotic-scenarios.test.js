"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const shift_parser_1 = require("shift-parser");
const interpreter_1 = require("../src/interpreter");
const chai_1 = __importDefault(require("chai"));
describe("ExoticScenarios", () => {
    it("should allow piecemeal execution", () => {
        const source = `
    (function() {
      var c = {
        hsakO: "3|4|2|1|0",
        tPkAq: function(d, e) {
          return d === e;
        },
        YhcXR: "reader",
        PFwHf: "world"
      };
      class f {
        constructor(g) {
          this["target"] = g;
        }
        ["greet"]() {
          var h = c["hsakO"]["split"]("|"),
            i = 0x0;
          while (!![]) {
            switch (h[i++]) {
              case "0":
                console["log"](
                  "I\x20have\x20run\x20out\x20of\x20things\x20to\x20say."
                );
                continue;
              case "1":
                console["log"]("I\x20hope\x20you\x20have\x20a\x20good\x20day!");
                continue;
              case "2":
                if (c["tPkAq"](this["target"], c["YhcXR"])) {
                  console["log"]("I\x20like\x20your\x20hair!");
                }
                continue;
              case "3":
                console["log"]("Hello\x20" + this["target"]);
                continue;
              case "4":
                if (c["tPkAq"](this["target"], c["PFwHf"])) {
                  console["log"]("It\x27s\x20beautiful\x20out,\x20isn\x27t\x20it?");
                }
                continue;
            }
            break;
          }
        }
        ["setTarget"](j) {
          this["target"] = j;
        }
      }
      const k = new f(c["PFwHf"]);
      k["greet"]();
      k["setTarget"](c["YhcXR"]);
      k["greet"]();
    })();    
    `;
        const tree = shift_parser_1.parseScript(source);
        const interpreter = new interpreter_1.Interpreter();
        interpreter.analyze(tree);
        // @ts-ignore
        interpreter.evaluateStatement(tree.statements[0].expression.callee.body.statements[0]);
        // @ts-ignore
        interpreter.evaluateStatement(tree.statements[0].expression.callee.body.statements[1].elements[1].method.body.statements[0]);
        // @ts-ignore
        const v = interpreter.getVariableValue(tree.statements[0].expression.callee.body.statements[1].elements[1].method.body.statements[0].declaration.declarators[0].binding);
        chai_1.default.expect(v).to.deep.equal(['3', '4', '2', '1', '0']);
    });
});
//# sourceMappingURL=exotic-scenarios.test.js.map