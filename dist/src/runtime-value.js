"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RuntimeValue {
    constructor(value, { didReturn = false, didContinue = false, didBreak = false } = {}) {
        this.didReturn = false;
        this.didBreak = false;
        this.didContinue = false;
        this.value = value;
        this.didContinue = didContinue;
        this.didBreak = didBreak;
        this.didReturn = didReturn;
    }
    unwrap() {
        return this.value;
    }
    static wrap(obj) {
        if (obj instanceof RuntimeValue)
            return obj;
        else
            return new RuntimeValue(obj);
    }
    static unwrap(value) {
        if (value instanceof RuntimeValue)
            return value.unwrap();
        else
            return value;
    }
}
exports.RuntimeValue = RuntimeValue;
//# sourceMappingURL=runtime-value.js.map