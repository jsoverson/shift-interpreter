"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ReturnValueWithState {
    constructor(value, { didReturn = false, didContinue = false, didBreak = false } = {}) {
        this.didReturn = false;
        this.didBreak = false;
        this.didContinue = false;
        this.value = value;
        this.didContinue = didContinue;
        this.didBreak = didBreak;
        this.didReturn = didReturn;
    }
}
exports.ReturnValueWithState = ReturnValueWithState;
//# sourceMappingURL=return-value.js.map