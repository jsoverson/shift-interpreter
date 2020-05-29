"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = __importDefault(require("chai"));
const waterfall_1 = require("../src/waterfall");
describe("waterfall", () => {
    it("should run a series of promises in order", async function () {
        const array = [
            'something',
            1,
            { other: 'this' }
        ];
        const arrayIndex = [];
        async function promiseGenerator(el, i) {
            return new Promise((res, rej) => {
                setTimeout(() => res(el), Math.random() * 200);
            });
        }
        async function promiseGeneratorIndex(el, i) {
            return new Promise((res, rej) => {
                setTimeout(() => { arrayIndex[i] = el; res(); }, Math.random() * 200);
            });
        }
        const newArray = await waterfall_1.waterfallMap(array, promiseGenerator);
        chai_1.default.expect(newArray).to.deep.equal(array);
        await waterfall_1.waterfallMap(array, promiseGeneratorIndex);
        chai_1.default.expect(arrayIndex).to.deep.equal(array);
        chai_1.default.expect(arrayIndex).to.deep.equal(newArray);
    });
});
//# sourceMappingURL=waterfall.test.js.map