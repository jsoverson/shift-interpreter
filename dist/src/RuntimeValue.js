"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RuntimeValue {
    constructor(value) {
        this.value = value;
    }
    get() {
        return this.value;
    }
    static wrap(obj) {
        if (obj instanceof RuntimeValue)
            return obj;
        else
            return new RuntimeValue(obj);
    }
}
exports.RuntimeValue = RuntimeValue;
//# sourceMappingURL=RuntimeValue.js.map