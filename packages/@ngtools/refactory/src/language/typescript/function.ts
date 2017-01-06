import * as ts from 'typescript';
import {TypeScriptFile} from './file';
import {TypeScriptStaticSymbol} from './symbol';


export class FunctionDeclaration extends TypeScriptStaticSymbol<ts.FunctionDeclaration> {
  private constructor(node: ts.FunctionDeclaration, file: TypeScriptFile) {
    super(node.name.text, node, file);
  }

  static fromNode(node: ts.Node, file: TypeScriptFile): FunctionDeclaration {
    if (node.kind !== ts.SyntaxKind.FunctionDeclaration) {
      throw new Error(`Node of kind ${node.kind} is not a function declaration.`);
    }

    return new FunctionDeclaration(node as ts.FunctionDeclaration, file);
  }

  private _exported: boolean | null = null;
  get isExported(): boolean {
    if (this._exported === null) {
      this._exported = ((this._node.modifiers || []) as Array<ts.Node>)
        .some((m: ts.Node) => m.kind == ts.SyntaxKind.ExportKeyword);
    }
    return this._exported;
  }
}


export class CallExpression {
  private constructor(public readonly node: ts.CallExpression,
                      public readonly file: TypeScriptFile) {}

  static fromNode(node: ts.Node, file: TypeScriptFile): CallExpression {
    if (node.kind !== ts.SyntaxKind.CallExpression) {
      throw new Error(`Node of kind ${node.kind} is not a call expression.`);
    }
    return new this(node as ts.CallExpression, file);
  }

  get name(): string | null {
    if (this.node.expression.kind !== ts.SyntaxKind.Identifier) {
      return null;
    }
    return (this.node.expression as ts.Identifier).text;
  }

  get source(): FunctionDeclaration | null {
    if (this.name === null) {
      // This is not a static expression.
      return null;
    }

    for (const i of this.file.imports) {
      if (i.source != null && i.name == this.name) {
        if (i.source instanceof FunctionDeclaration) {
          return i.source as FunctionDeclaration;
        }
      }
    }
    return null;
  }
}
