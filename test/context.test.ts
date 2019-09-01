import { assertResult, compare } from "./util";
import chai, {expect} from 'chai';
import spies from 'chai-spies';

chai.use(spies);

describe("Functions", () => {
  it("should call functions defined on the context", () => {
    const console = {
      log: function(msg:string){return undefined}
    }
    chai.spy.on(console, 'log');
    
    assertResult(compare(`
      console.log("Hello world");
    `, {console}));

    debugger;

    expect(console.log).to.have.been.called.with("Hello world");
    
  });
});


