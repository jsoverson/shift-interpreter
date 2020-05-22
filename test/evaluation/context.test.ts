import { assertResult, compare } from "../util";
import chai, {expect} from 'chai';
import spies from 'chai-spies';

chai.use(spies);

describe("External context", () => {
  it("should call functions defined on the context", async () => {
    const console = {
      log: function(msg:string){return undefined}
    }
    chai.spy.on(console, 'log');
    
    assertResult(await compare(`
      console.log("Hello world");
    `, {console}));


    expect(console.log).to.have.been.called.with("Hello world");
    
  });

});


