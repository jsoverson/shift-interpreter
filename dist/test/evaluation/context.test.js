"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
const chai_1 = __importStar(require("chai"));
const chai_spies_1 = __importDefault(require("chai-spies"));
chai_1.default.use(chai_spies_1.default);
describe("External context", () => {
    it("should call functions defined on the context", async () => {
        const console = {
            log: function (msg) { return undefined; }
        };
        chai_1.default.spy.on(console, 'log');
        util_1.assertResult(await util_1.compare(`
      console.log("Hello world");
    `, { console }));
        chai_1.expect(console.log).to.have.been.called.with("Hello world");
    });
});
//# sourceMappingURL=context.test.js.map