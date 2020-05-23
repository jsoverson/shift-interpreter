
export class RuntimeValue<T> {
  didReturn = false;
  didBreak = false;
  didContinue = false;
  value: T;
  constructor(value:T, { didReturn = false, didContinue = false, didBreak = false } = {}) {
    this.value = value;
    this.didContinue = didContinue;
    this.didBreak = didBreak;
    this.didReturn = didReturn;
  }
  unwrap(): T {
    return this.value;
  }
  static wrap<K>(obj: K) {
    if (obj instanceof RuntimeValue) return obj;
    else return new RuntimeValue(obj);
  }
  static unwrap(value: any) {
    if (value instanceof RuntimeValue) return value.unwrap();
    else return value;
  }
}
