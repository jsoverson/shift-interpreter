import {RuntimeValue} from './runtime-value';

function deconstruct(rv: any): any {
  if (rv instanceof RuntimeValue) return rv.unwrap();
  else return rv;
}

export const binaryOperatorMap = new Map<string, any>([
  ['+', (l: any, r: any) => l + r],
  ['-', (l: any, r: any) => l - r],
  ['/', (l: any, r: any) => l / r],
  ['*', (l: any, r: any) => l * r],
  ['**', (l: any, r: any) => l ** r],
  ['==', (l: any, r: any) => l == r],
  ['!=', (l: any, r: any) => l != r],
  ['===', (l: any, r: any) => l === r],
  ['!==', (l: any, r: any) => l !== r],
  ['<', (l: any, r: any) => l < r],
  ['<=', (l: any, r: any) => l <= r],
  ['>', (l: any, r: any) => l > r],
  ['>=', (l: any, r: any) => l >= r],
  ['in', (l: any, r: any) => l in r],
  ['instanceof', (l: any, r: any) => l instanceof r],
  ['<<', (l: any, r: any) => l << r],
  ['>>', (l: any, r: any) => l >> r],
  ['>>>', (l: any, r: any) => l >>> r],
  ['%', (l: any, r: any) => l % r],
  [',', (l: any, r: any) => r],
  ['||', (l: any, r: any) => l || r],
  ['&&', (l: any, r: any) => l && r],
  ['|', (l: any, r: any) => l | r],
  ['&', (l: any, r: any) => l & r],
  ['^', (l: any, r: any) => l ^ r],
]);

export const unaryOperatorMap = new Map<string, any>([
  ['+', (oper: any) => +oper],
  ['-', (oper: any) => -oper],
  ['!', (oper: any) => !oper],
  ['~', (oper: any) => ~oper],
  ['typeof', (oper: any) => typeof oper],
  ['void', (oper: any) => void oper],
  // ["delete", (l: any) => l * r],
]);

export const compoundAssignmentOperatorMap = new Map<string, any>([
  ['+=', (l: any, r: any) => l + r],
  ['-=', (l: any, r: any) => l - r],
  ['/=', (l: any, r: any) => l / r],
  ['*=', (l: any, r: any) => l * r],
  ['**=', (l: any, r: any) => l ** r],
  ['<<=', (l: any, r: any) => l << r],
  ['>>=', (l: any, r: any) => l >> r],
  ['>>>=', (l: any, r: any) => l >>> r],
  ['%=', (l: any, r: any) => l % r],
  ['|=', (l: any, r: any) => l | r],
  ['&=', (l: any, r: any) => l & r],
  ['^=', (l: any, r: any) => l ^ r],
]);
