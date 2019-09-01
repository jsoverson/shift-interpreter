import { AssignmentTargetIdentifier, BindingIdentifier, Block, Expression, FunctionBody, FunctionDeclaration, IdentifierExpression, Script, Statement, VariableDeclaration } from "shift-ast";
import shiftScope, { ScopeLookup } from "shift-scope";
import { InterpreterFunction } from "./intermediate-types";
import { InterpreterContext } from "./context";

export class InterpreterRuntimeError extends Error {}

const binaryOperatorMap = new Map<string, any>([
  ["+", (l: any, r: any) => l + r],
  ["-", (l: any, r: any) => l - r],
  ["/", (l: any, r: any) => l / r],
  ["*", (l: any, r: any) => l * r],
  ["**", (l: any, r: any) => l ** r],
  ["==", (l: any, r: any) => l == r],
  ["!=", (l: any, r: any) => l != r],
  ["===", (l: any, r: any) => l === r],
  ["!==", (l: any, r: any) => l !== r],
  ["<", (l: any, r: any) => l < r],
  ["<=", (l: any, r: any) => l <= r],
  [">", (l: any, r: any) => l > r],
  [">=", (l: any, r: any) => l >= r],
  ["in", (l: any, r: any) => l in r],
  ["instanceof", (l: any, r: any) => l instanceof r],
  ["<<", (l: any, r: any) => l << r],
  [">>", (l: any, r: any) => l >> r],
  [">>>", (l: any, r: any) => l >>> r],
  ["%", (l: any, r: any) => l % r],
  [",", (l: any, r: any) => r],
  ["||", (l: any, r: any) => l || r],
  ["&&", (l: any, r: any) => l && r],
  ["|", (l: any, r: any) => l | r],
  ["&", (l: any, r: any) => l & r],
  ["^", (l: any, r: any) => l ^ r]
]);

const unaryOperatorMap = new Map<string, any>([
  ["+", (oper: any) => +oper],
  ["-", (oper: any) => -oper],
  ["!", (oper: any) => !oper],
  ["~", (oper: any) => ~oper],
  ["typeof", (oper: any) => typeof oper],
  ["void", (oper: any) => void oper],
  // ["delete", (l: any) => l * r],
]);

type Identifier =
  | BindingIdentifier
  | IdentifierExpression
  | AssignmentTargetIdentifier;

interface Options {
  skipUnsupported?: boolean
}

export class Interpreter {
  private context: InterpreterContext;
  private globalScope: any;
  private scopeLookup: any;
  private variableMap = new Map();
  private options: Options;

  constructor(context: InterpreterContext = {}, options: Options = {}) {
    this.context = context;
    this.options = options;
  }
  skipOrThrow(type: string) {
    if (this.options.skipUnsupported) return;
    throw new InterpreterRuntimeError(`Unsupported node ${type}`);
  }
  evaluate(script: Script) {
    this.globalScope = shiftScope(script);
    this.scopeLookup = new ScopeLookup(this.globalScope).variableMap;
    return this.evaluateBlock(script);
  }
  evaluateBlock(block: Block | Script | FunctionBody) {
    let rv = undefined;
    for (let i = 0; i < block.statements.length; i++) {
      rv = this.evaluateStatement(block.statements[i]);
    }
    return rv;
  }
  evaluateStatement(stmt: Statement): any {
    if (!this.context) return;
    switch (stmt.type) {
      case "ReturnStatement": 
      case "ExpressionStatement":
        return this.evaluateExpression(stmt.expression);
      case "VariableDeclarationStatement":
        return this.declareVariables(stmt.declaration);
      case "FunctionDeclaration":
        return this.declareFunction(stmt)
      case "BlockStatement":
        return this.evaluateBlock(stmt.block);
      case "IfStatement": {
        const test = this.evaluateExpression(stmt.test);
        if (test) return this.evaluateStatement(stmt.consequent);
        else if (stmt.alternate) return this.evaluateStatement(stmt.alternate);
        break;
      }
      case "EmptyStatement":
        break;
      default:
        return this.skipOrThrow(stmt.type);
    }
  }
  declareFunction(decl: FunctionDeclaration) {
    const variables = this.scopeLookup.get(decl.name);

    if (variables.length > 1)
      throw new Error("reproduce this and handle it better");
    const variable = variables[0];

    this.variableMap.set(variable, new InterpreterFunction(decl, this));
  }
  declareVariables(decl: VariableDeclaration) {
    decl.declarators.forEach(declarator => {
      const variables = this.scopeLookup.get(declarator.binding);

      if (variables.length > 1)
        throw new Error("reproduce this and handle it better");
      const variable = variables[0];
      const init = this.evaluateExpression(declarator.init);
      this.variableMap.set(variable, init);
    });
  }
  updateVariableValue(node: Identifier, value: any) {
    const variables = this.scopeLookup.get(node);

    if (variables.length > 1)
      throw new Error("reproduce this and handle it better");
    const variable = variables[0];
    this.variableMap.set(variable, value);
  }
  getVariableValue(node: Identifier): any {
    const variables = this.scopeLookup.get(node);

    if (variables.length > 1)
      throw new Error("reproduce this and handle it better");
    const variable = variables[0];
    if (this.variableMap.has(variable)) {
      return this.variableMap.get(variable);
    } else {
      return this.context[variable.name];
    }
  }
  evaluateExpression(expr: Expression | null): any {
    // This might be wrong behavior.
    if (expr === null) return;
    switch (expr.type) {
      case "ObjectExpression": {
        const entries = expr.properties.map(prop => {
          switch (prop.type) {
            case "DataProperty": {
              const name = prop.name.type === "StaticPropertyName" ? prop.name.value : this.evaluateExpression(prop.name.expression);
              return [name, this.evaluateExpression(prop.expression)];
            }
            default:
              this.skipOrThrow(`${expr.type}[${prop.type}]`);
              return [];
          }
        });
        return Object.fromEntries(entries);
      }
      case "StaticMemberExpression": {
        if (expr.object.type === 'Super') return this.skipOrThrow(expr.object.type);
        const object = this.evaluateExpression(expr.object);
        return object[expr.property];
      }
      case "ComputedMemberExpression": {
        if (expr.object.type === 'Super') return this.skipOrThrow(expr.object.type);
        const object = this.evaluateExpression(expr.object);
        return object[this.evaluateExpression(expr.expression)];
      }
      case "FunctionExpression": 
        return new InterpreterFunction(expr, this);
      case "CallExpression": {
        if (expr.callee.type === 'Super') return this.skipOrThrow(expr.callee.type);
        const fn = this.evaluateExpression(expr.callee);
        const args: any[] = [];
        expr.arguments.forEach(_ => {
          if (_.type === "SpreadElement") {
            const value = this.evaluateExpression(_.expression);
            args.push(...value);
          } else {
            args.push(this.evaluateExpression(_));
          }
        });
      if (fn instanceof InterpreterFunction) {
          return fn.execute(args);
        } else if (typeof fn === 'function') {
          return fn(...args)
        } else {
          throw new Error(`Can not execute non-function ${fn}`)
        }
      }
      case "AssignmentExpression": {
        switch (expr.binding.type) {
          case "AssignmentTargetIdentifier":
            return this.updateVariableValue(
              expr.binding,
              this.evaluateExpression(expr.expression)
            );
          case "ArrayAssignmentTarget":
          case "ObjectAssignmentTarget":
          case "ComputedMemberAssignmentTarget":
          case "StaticMemberAssignmentTarget":
          default:
            return this.skipOrThrow(expr.binding.type);
        }
      }
      case "IdentifierExpression":
          return this.getVariableValue(expr);
      case "LiteralStringExpression":
      case "LiteralNumericExpression":
      case "LiteralBooleanExpression":
        return expr.value;
      case "LiteralInfinityExpression":
        return 1 / 0;
      case "LiteralNullExpression":
        return null;
      case "BinaryExpression": {
        const operation = binaryOperatorMap.get(expr.operator);
        return operation!(
          this.evaluateExpression(expr.left),
          this.evaluateExpression(expr.right)
        );
      }
      case "UnaryExpression": {
        const operation = unaryOperatorMap.get(expr.operator);
        if (!operation) return this.skipOrThrow(`${expr.type} : ${expr.operator}`);
        return operation!(
          this.evaluateExpression(expr.operand)
        );
      }
      default:
        return this.skipOrThrow(expr.type);
    }
  }
}
