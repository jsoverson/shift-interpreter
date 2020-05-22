
export class RuntimeValue {
  value: any;
  constructor(value:any) {
    this.value = value;
  }
  get() {
    return this.value;
  }
  static wrap(obj: any) {
    if (obj instanceof RuntimeValue) return obj;
    else return new RuntimeValue(obj);
  }
}
