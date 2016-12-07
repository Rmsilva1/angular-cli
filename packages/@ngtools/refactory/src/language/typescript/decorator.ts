import * as ts from 'typescript';

import {TypeScriptFile} from './file';
import {TypeScriptStaticSymbol} from './symbol';


export abstract class Decorator {
  protected constructor(protected _node: ts.Node, protected _target: TypeScriptStaticSymbol<any>) {}

  abstract get name(): string;
  get target() { return this._target; }

  static fromNode(node: ts.Decorator,
                  target: TypeScriptStaticSymbol<any>,
                  file: TypeScriptFile): Decorator {
    const expr = node.expression;

    if (expr.kind == ts.SyntaxKind.Identifier) {
      const id = expr as ts.Identifier;
      const symbol = file.resolveSymbol(id.text, false);

      if (symbol) {
        return new SimpleDecorator(id, target, symbol as TypeScriptStaticSymbol<any>);
      }
    } else if (expr.kind == ts.SyntaxKind.CallExpression) {
      const ce = expr as ts.CallExpression;
      if (ce.expression.kind !== ts.SyntaxKind.Identifier) {
        return new DynamicDecorator(node, target);
      }

      const symbol = file.resolveSymbol((ce.expression as ts.Identifier).text, false);
      if (symbol) {
        return new FunctionCallDecorator(ce, symbol as TypeScriptStaticSymbol<any>, target);
      }
    }
    return null;
  }
}


/**
 * A simple decorator, that is basically an identifier.
 */
export class SimpleDecorator extends Decorator {
  constructor(node: ts.Identifier,
              private _symbol: TypeScriptStaticSymbol<any>,
              target: TypeScriptStaticSymbol<any>) {
    super(node, target);
  }

  get name() { return (this._node as ts.Identifier).text; }
  get symbol() { return this._symbol; }
}


/**
 * A decorator that is of the form @FunctionIdentifier(arg1, arg2, arg3, ...).
 */
export class FunctionCallDecorator extends Decorator {
  constructor(node: ts.CallExpression,
              private _symbol: TypeScriptStaticSymbol<any>,
              target: TypeScriptStaticSymbol<any>) {
    super(node, target);
  }

  get name() { return ((this._node as ts.CallExpression).expression as ts.Identifier).text; }
}


/**
 * A Decorator that's the result of an expression that cannot be evaluated.
 */
export class DynamicDecorator extends Decorator {
  constructor(public readonly node: ts.Node, target: TypeScriptStaticSymbol<any>) {
    super(node, target);
  }

  get name(): string { return null; }
}
