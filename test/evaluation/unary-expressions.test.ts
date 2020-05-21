import { compare, assertResult } from "../util";

const operators = [
  '+' , '-' , '!' , '~' , 'typeof' , 'void' //, 'delete'
];
// const specialOps = ['in' , 'instanceof'];
describe("UnaryExpressions", () => {
  it("should evaluate operators the same as the host environment", () => {
    const operands = [2, 120, 1981, "2", "hi", NaN, true, false, 1 / 0];
    const results = operators.flatMap(op =>
      operands.map(oper =>
          compare(`${op} ${JSON.stringify(oper)}`)
      )
    );
    results.forEach(assertResult);
  });
});
