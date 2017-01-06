import * as ts from 'typescript';
import {TypeScriptFile} from './file';
import {Decorator} from './decorator';
import {TypeScriptStaticSymbol} from './symbol';


export class ClassDeclaration extends TypeScriptStaticSymbol<ts.ClassDeclaration> {
  private constructor(node: ts.ClassDeclaration, file: TypeScriptFile) {
    super(node.name.text, node, file);
  }

  static fromNode(node: ts.Node, file: TypeScriptFile): ClassDeclaration {
    if (node.kind !== ts.SyntaxKind.ClassDeclaration) {
      throw new Error(`Node of kind ${node.kind} is not a class declaration.`);
    }

    return new ClassDeclaration(node as ts.ClassDeclaration, file);
  }

  private _decorators: Decorator[] = null;
  get decorators(): Decorator[] {
    if (!this._decorators) {
      this._decorators = this._node.decorators
        .map(node => Decorator.fromNode(node, this, this.file))
        .filter(node => !!node);
    }
    return this._decorators;
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
