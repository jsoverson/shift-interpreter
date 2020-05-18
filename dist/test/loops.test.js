"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
describe("Loops", () => {
    describe("For Loops", () => {
        it("should evaluate basic for loops", () => {
            util_1.assertResult(util_1.compare('let b = 0; for (let a = 1; a <= 2; a++) {b = b + a} b;'));
        });
        it("should support break statements", () => {
            util_1.assertResult(util_1.compare('let b = 0; for (let a = 1; a <= 2; a++) {b = b + a; break} b;'));
        });
        it("should support nested break statements", () => {
            util_1.assertResult(util_1.compare('let b = 0; for (let a = 1; a <= 2; a++) {for (let i = 1; i < 10; i++) {break; b++;}; b = b + a;} b;'));
        });
        it("should support continue statements", () => {
            util_1.assertResult(util_1.compare('let b = 0; for (let a = 1; a <= 2; a++) {b = b + a; continue; b += 2} b;'));
        });
        it("should support nested continue statements", () => {
            util_1.assertResult(util_1.compare('let b = 0; for (let a = 1; a <= 2; a++) {for (let i = 1; i < 10; i++) {b++; continue; b++;}; b = b + a;} b;'));
        });
    });
    it('should support for...in statements', () => {
        util_1.assertResult(util_1.compare(`let a = {a:1,b:2},c = 0; for (let b in a) { c+=a[b]; } c;`));
    });
    it('should support for...of statements', () => {
        util_1.assertResult(util_1.compare(`let a = [1,2],c = 0; for (let b of a) { c+=b; } c;`));
    });
    it("should support while statements", () => {
        util_1.assertResult(util_1.compare('let a = 0; while(a < 10) {a++} a;'));
    });
    it("should support do-while statements", () => {
        util_1.assertResult(util_1.compare('let a = 0; do{a++}while(a < 10) a;'));
    });
});
//# sourceMappingURL=loops.test.js.map