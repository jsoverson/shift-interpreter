
import chai from "chai";
import {waterfallMap} from '../src/waterfall';

describe("waterfall", () => {
  it("should run a series of promises in order", async function() {
    const array = [
      'something',
      1,
      {other:'this'}
    ];

    const arrayIndex: any[] = [];

    async function promiseGenerator(el: any, i: number) {
      return new Promise(
        (res,rej) => {
          setTimeout(() => res(el), Math.random() * 200)
        }
      );
    }
    async function promiseGeneratorIndex(el: any, i: number) {
      return new Promise((res,rej) => {
        setTimeout(() => {arrayIndex[i] = el;res();}, Math.random() * 200);
      })
    }
    const newArray = await waterfallMap(array, promiseGenerator);
    chai.expect(newArray).to.deep.equal(array);
    await waterfallMap(array, promiseGeneratorIndex);
    chai.expect(arrayIndex).to.deep.equal(array);
    chai.expect(arrayIndex).to.deep.equal(newArray);
  });
});
