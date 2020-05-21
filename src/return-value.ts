
export class ReturnValueWithState {
  didReturn = false;
  didBreak = false;
  didContinue = false;
  value: any;

  constructor(value: any, { didReturn = false, didContinue = false, didBreak = false } = {}) {
    this.value = value;
    this.didContinue = didContinue;
    this.didBreak = didBreak;
    this.didReturn = didReturn;
  }
}
