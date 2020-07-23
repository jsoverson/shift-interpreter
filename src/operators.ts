import {RuntimeValue} from './runtime-value';

function deconstruct(rv: any): any {
  if (rv instanceof RuntimeValue) return rv.unwrap();
  else return rv;
}

export const binaryOperatorMap = new Map<string, any>([
  ['+', async (l: any, r: any) => l + (await r())],
  ['-', async (l: any, r: any) => l - (await r())],
  ['/', async (l: any, r: any) => l / (await r())],
  ['*', async (l: any, r: any) => l * (await r())],
  ['**', async (l: any, r: any) => l ** (await r())],
  ['==', async (l: any, r: any) => l == (await r())],
  ['!=', async (l: any, r: any) => l != (await r())],
  ['===', async (l: any, r: any) => l === (await r())],
  ['!==', async (l: any, r: any) => l !== (await r())],
  ['<', async (l: any, r: any) => l < (await r())],
  ['<=', async (l: any, r: any) => l <= (await r())],
  ['>', async (l: any, r: any) => l > (await r())],
  ['>=', async (l: any, r: any) => l >= (await r())],
  ['in', async (l: any, r: any) => l in (await r())],
  ['instanceof', async (l: any, r: any) => l instanceof (await r())],
  ['<<', async (l: any, r: any) => l << (await r())],
  ['>>', async (l: any, r: any) => l >> (await r())],
  ['>>>', async (l: any, r: any) => l >>> (await r())],
  ['%', async (l: any, r: any) => l % (await r())],
  [',', async (l: any, r: any) => await r()],
  ['||', async (l: any, r: any) => l || (await r())],
  ['&&', async (l: any, r: any) => l && (await r())],
  ['|', async (l: any, r: any) => l | (await r())],
  ['&', async (l: any, r: any) => l & (await r())],
  ['^', async (l: any, r: any) => l ^ (await r())],
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
