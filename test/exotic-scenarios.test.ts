import { Interpreter } from '../src/interpreter';
import {parseScript} from "shift-parser";

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
    const tree = parseScript(source);
    const interpreter = new Interpreter();
    interpreter.analyze(tree);
    interpreter.evaluateStatement(tree.statements[0].expression.callee.body.statements[0]);
    interpreter.evaluateStatement(tree.statements[0].expression.callee.body.statements[1].elements[1].method.body.statements[0]);
    const v = interpreter.getVariableValue(tree.statements[0].expression.callee.body.statements[1].elements[1].method.body.statements[0].declaration.declarators[0].binding)
    console.log(v)


    
  });
  it("stream: stage 5", () => {
    const source = `
    var a = [
      "opKyd",
      "log",
      "Hello\x20",
      "target",
      "world",
      "It\x27s\x20beautiful\x20out,\x20isn\x27t\x20it?",
      "reader",
      "I\x20like\x20your\x20hair!",
      "I\x20have\x20run\x20out\x20of\x20things\x20to\x20say.",
      "greet",
      "uXPpI",
      "BBRiF",
      "kxpqP",
      "MIGiO",
      "PQXfs",
      "I\x20hope\x20you\x20have\x20a\x20good\x20day!",
      "setTarget",
      "mYfPc"
    ];
    var b = function(c, d) {
      c = c - 0x0;
      var e = a[c];
      return e;
    };
    (function() {
      class c {
        constructor(d) {
          if (b("0x0") !== b("0x0")) {
            console[b("0x1")](b("0x2") + this["target"]);
            if (this[b("0x3")] === b("0x4")) {
              console["log"](b("0x5"));
            }
            if (this[b("0x3")] === b("0x6")) {
              console[b("0x1")](b("0x7"));
            }
            console[b("0x1")]("I\x20hope\x20you\x20have\x20a\x20good\x20day!");
            console["log"](b("0x8"));
          } else {
            this[b("0x3")] = d;
          }
        }
        [b("0x9")]() {
          if (b("0xa") === b("0xb")) {
            console[b("0x1")](b("0x7"));
          } else {
            console["log"]("Hello\x20" + this["target"]);
            if (this[b("0x3")] === b("0x4")) {
              if (b("0xc") === b("0xd")) {
                console[b("0x1")](b("0x5"));
              } else {
                console[b("0x1")](b("0x5"));
              }
            }
            if (this["target"] === b("0x6")) {
              if ("PQXfs" !== b("0xe")) {
                this["target"] = target;
              } else {
                console[b("0x1")](b("0x7"));
              }
            }
            console["log"](b("0xf"));
            console["log"](b("0x8"));
          }
        }
        [b("0x10")](i) {
          if (b("0x11") !== "YjRWy") {
            this[b("0x3")] = i;
          } else {
            this[b("0x3")] = i;
          }
        }
      }
      const k = new c(b("0x4"));
      k["greet"]();
      k[b("0x10")](b("0x6"));
      k[b("0x9")]();
    })();    
    `;
    const tree = parseScript(source);
    const interpreter = new Interpreter();
    interpreter.analyze(tree);
    interpreter.evaluateStatement(tree.statements[0]);
    interpreter.evaluateStatement(tree.statements[1]);
    // const exprValue = interpreter.evaluateStatement(tree.statements[2])
    
  });
});

