# Shift Interpreter

Shift-interpreter is an experimental JavaScript meta-interpreter useful for reverse engineering and analysis. One notable difference from other projects is that shift-interpreter retains state over an entire script but can be fed expressions and statements piecemeal, regardless of their original location. This allows a user to execute only the portions of JavaScript necessary for analysis.

## Who is this for

JavaScript analyzers.

This was created to aid "static" analysis, reverse engineering, and deobfuscation of JavaScript code.

## Status

[Experimental](http://nodejs.org/api/documentation.html#documentation_stability_index).

This library is frequently used in ad-hoc analysis but has never been used in any high performance or mission critical applications.

## Warning!

This should not be considered a secure JavaScript sandbox. This is _not_ a secure JavaScript sandbox.

## Installation

```sh
$ npm install shift-interpreter
```

## Usage

### Basic usage

```js
const { interpret } = require('shift-intepreter');

const source = `
const a = 40;
a + a + 20;
`;

const result = interpret(source);
console.log(result); // 100
```

The above is equivalent to the following:

```js
const { parseScript } = require('shift-parser');
const { Interpreter } = require('shift-intepreter');

const source = `
const a = 40;
a + a + 20;
`;

const tree = parseScript(source);

const interpreter = new Interpreter();
interpreter.load(tree);

const result = interpreter.run();
console.log(result); // 100
```

### Passing contexts

By default, a script has access to nothing, its global context is empty. Pass a JavaScript object as the second parameter to `.load()` to use as the global context.

```js
const { parseScript } = require('shift-parser');
const { Interpreter } = require('shift-intepreter');

const source = `
console.log("hello world!");
`;

const tree = parseScript(source);

const interpreter = new Interpreter();
interpreter.load(tree);
const result = interpreter.run(); // ReferenceError: console is not defined

interpreter.load(tree, { console });
const result = interpreter.run(); // "hello world!"
```

### Selective Execution

The following is an example of selective execution. This program decodes an array of strings while only actually executing one statement in the target source.

```js
const { parseScript } = require('shift-parser');
const { Interpreter } = require('shift-intepreter');

const source = `
const strings = [ "ZG9jdW1lbnQ=", "YWRkRXZlbnRMaXN0ZW5lcg==", "bG9hZA==" ];
function decode(str) {
  return atob(str)
}
window[decode(strings[0])][decode(strings[1])](decode(strings[2]), () => {
  somework();
})
`;

const tree = parseScript(source);

const interpreter = new Interpreter();

// load the tree with a context that has an "atob" function
interpreter.load(tree, {
  atob: str => Buffer.from(str, 'base64').toString('ascii'),
});

// run the second statement in the script (the "decode" function declaration)
interpreter.run(tree.statements[1]);

// retrieve the array expression node from the parsed source.
const stringArrayExpression = tree.statements[0].declaration.declarators[0].init;

// get the runtime value of the function declaration above. This is the interpreter's
// value for the passed identifier, which in this case is an executable function.
const decodeFunction = interpreter.getRuntimeValue(tree.statements[1].name);

// map over the elements of the array expression, decoding each value with the function from the interpreter.
const decodedStrings = stringArrayExpression.elements.map(node => decodeFunction(node.value));

console.log(decodedStrings); // [ 'document', 'addEventListener', 'load' ]
```

## API

### interpret/intrepretSource(src, context)

### interpretTree(ast, context)

These methods run the source (or AST), with the optional context, and return the result of execution. These are convenience methods exposed for rapid testing and are not the main use of the library. If you find your use case covered with these, you probably want another tool (or `eval`)

### Interpreter(options)

Constructor for the interpreter, takes an options object.

#### options

**options.skipUnsupported: boolean**

Skip unsupported nodes, false by default. There are few nodes unsupported outright but there are numerous combinations of nodes that are not supported (e.g. array assignments in for..of). These throw an error by default but you can skip them if their execution isn't important to you by passing `{skipUnsupported: true}`

Note: Submit issues for unsupported nodes along with use cases and minimal reproducible source. Most cases are not supported only due to time and lack of a pressing need, not due to complexity.

**options.handler: NodeHandler**

Pass your own handler to override or augment behavior for specific nodes.

#### .load(ast, context = {})

Load an ast as the script this intepreter will analyze for state and execution. Optionally pass a context object to use as the
global context

#### .run(node?)

Run the script or the passed node. Returns the result of execution.

#### .runToFirstError(node?)

Like .run(), but swallows the error so you don't need to litter try/catches around implementing code. Useful when you find unsupported cases but enough of the program runs to cover your needs.

#### .getRuntimeValue(identifierNode)

Get the interpreter's runtime value for the passed identifier node.

## Known limitations

Too many to list, but here are a few.

- This is not a sandbox. Modifications of native APIs will persist in the host environment.
- Edge cases around Symbols not explored.
- Does not support Class constructors with `super()`. These could be supported but I haven't had a reason to work on it yet.

The following support is deferred until necessary. The syntax is not often found in production code due to common practices or transpilation.

- Does not support with statements.
- Does not support label statements.
- Does not support yield expressions.
- Does not support tagged template strings.
- Does not support await expressions.

## Contributing

This is a "get stuff done" library. It has grown as limitations have been found in real world usage. Contributions need to reflect real world use cases. Improvements to interpreter accuracy that primarily address edge cases will only be considered if they make the codebase more maintainable.

Are you an ECMAScript specification or interpreter guru and can point out the million ways this fails? Feel free to submit issues or PRs with (skipped) tests for minimal reproducible cases. They will be included to help future implementers.
