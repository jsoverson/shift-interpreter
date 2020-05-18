# Shift Interpreter

Shift-interpreter is an experimental JavaScript meta-interpreter useful for reverse engineering and analysis. One notable difference from other projects is that shift-inter retains state over an entire script but can be fed expressions and statements piecemeal, regardless of their original location.

Random, piecemeal execution allows a 


## Status

[Experimental](http://nodejs.org/api/documentation.html#documentation_stability_index).

The features and methods here are regularly used in local analysis but have never been used in anything mission critical.

## Installation

```sh
$ npm install shift-interpreter
```

## Usage

Basic usage

```js
const { parseScript } = require('shift-parser');
const { Interpreter } = require('shift-intepreter');

const source = `
const a = 40;
a + a + 20;
`;

const ast = parseScript(source);

const interpreter = new Interpreter();
executionResult = interpreter.evaluate(ast);
console.log(executionResult); // 100;
```

```js
const source = `
const a = 5;
`
const tree = parseScript(source);
const interpreter = new Interpreter();
interpreter.analyze(tree);
interpreter.evaluateStatement(tree.statements[0].expression.callee.body.statements[0]);
interpreter.evaluateStatement(tree.statements[0].expression.callee.body.statements[1].elements[1].method.body.statements[0]);
const v = interpreter.getVariableValue(tree.statements[0].expression.callee.body.statements[1].elements[1].method.body.statements[0].declaration.declarators[0].binding)
console.log(v)
```

## Known limitations

- This is not a sandbox. Modifications of native APIs will persist in the host environment.
- Shift-interpreter does not make much effort to catch errors that would be caught in a complete JS environment. What is handled is case-by-case depending on requirements and complexity.
- Does not support BigInt.
- Edge cases around Symbols not explored.
- Does not support tagged template strings.
- Does not support Class constructors with `super()`
- Probably doesn't support a lot more than what's listed.

Submit issues as you find them with minimal examples that break. Skipped tests will be added for future implementers.





