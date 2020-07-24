export type BasicContext = Record<string, any>;

export function proxyContext(context: BasicContext, args?: IArguments) {
  return new Proxy(context, {
    get(target: any, property: string | number | Symbol) {
      if (args && property === 'arguments' && !('arguments' in context)) return args;
      if (typeof property === 'string' || typeof property === 'number') return target[property];
      //@ts-ignore Don't have time to troubleshoot why TS doesn't like this (start here: https://github.com/microsoft/TypeScript/issues/1863)
      return target[property];
    },
  });
}
