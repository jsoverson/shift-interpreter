"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class xArguments {
    constructor(interpreter, callee, params) {
        this.callee = callee;
        this.length = 0;
        for (let i = 0; i < params.items.length; i++) {
            const item = params.items[i];
        }
    }
}
exports.xArguments = xArguments;
function createFunction(fn, interpreter) {
    let name = undefined;
    if (fn.name) {
        switch (fn.name.type) {
            case 'BindingIdentifier':
                name = fn.name.name;
                break;
            case 'ComputedPropertyName':
                name = interpreter.evaluateExpression(fn.name.expression);
                break;
            case 'StaticPropertyName':
                name = fn.name.value;
        }
    }
    const fnContainer = {
        [name]: function (...args) {
            interpreter.pushContext(this);
            interpreter.argumentsMap.set(this, arguments);
            if (fn.type === 'Getter') {
                // TODO need anything here?
            }
            else if (fn.type === 'Setter') {
                interpreter.bindVariable(fn.param, args[0]);
            }
            else {
                fn.params.items.forEach((param, i) => {
                    interpreter.bindVariable(param, args[i]);
                });
            }
            const blockResult = interpreter.evaluateBlock(fn.body);
            interpreter.popContext();
            return blockResult.value;
        }
    };
    return fnContainer[name];
}
exports.createFunction = createFunction;
function createArrowFunction(fn, context, interpreter) {
    return function () {
        return (...args) => {
            interpreter.pushContext(this);
            fn.params.items.forEach((param, i) => {
                interpreter.bindVariable(param, args[i]);
            });
            let returnValue = undefined;
            if (fn.body.type === 'FunctionBody') {
                const blockResult = interpreter.evaluateBlock(fn.body);
                returnValue = blockResult.value;
            }
            else {
                returnValue = interpreter.evaluateExpression(fn.body);
            }
            interpreter.popContext();
            return returnValue;
        };
    }.bind(context)();
}
exports.createArrowFunction = createArrowFunction;
//# sourceMappingURL=intermediate-types.js.map