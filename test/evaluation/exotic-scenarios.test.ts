import {parseScript} from 'shift-parser';
import {Interpreter} from '../../src/interpreter';
import {ExpressionStatement} from 'shift-ast';
import chai from 'chai';
import {assertResult, compare} from '../util';

describe('ExoticScenarios', () => {
  it('what', () => {
    assertResult(compare(`'();'.replace('()', function(){})`));
  });
  it('should allow piecemeal execution', () => {
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
    interpreter.load(tree);
    // @ts-ignore
    interpreter.evaluate(tree.statements[0].expression.callee.body.statements[0]);
    interpreter.evaluate(
      // @ts-ignore
      tree.statements[0].expression.callee.body.statements[1].elements[1].method.body.statements[0],
    );
    const v = interpreter.getRuntimeValue(
      // @ts-ignore
      tree.statements[0].expression.callee.body.statements[1].elements[1].method.body.statements[0].declaration
        .declarators[0].binding,
    );
    chai.expect(v).to.deep.equal(['3', '4', '2', '1', '0']);
  });
});
