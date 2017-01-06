import * as ts from 'typescript';
import {TypeScriptFile} from './file';
import {TypeScriptStaticSymbol} from './symbol';


export class Import extends TypeScriptStaticSymbol<ts.ImportDeclaration> {
  protected _source: TypeScriptStaticSymbol<any>;

  private constructor(name: string, protected _originalName: string, protected _modulePath: string,
                      node: ts.ImportDeclaration, file: TypeScriptFile) {
    super(name, node, file);

    this._source = file.resolveModule(_modulePath)
      .resolveSymbol(_originalName) as TypeScriptStaticSymbol<any>;
  }

  get isExported() { return false; }
  get source() { return this._source; }

  static importsFromNode(node: ts.Node, file: TypeScriptFile): Import[] {
    const decl = node as ts.ImportDeclaration;
    const ms = decl.moduleSpecifier;
    let modulePath: string | null = null;
    switch (ms.kind) {
      case ts.SyntaxKind.StringLiteral:
        modulePath = (ms as ts.StringLiteral).text;
        break;
      default:
        throw new Error(`Invalid module specifier: "${ms.getFullText(file.sourceFile)}"`);
    }

    if (decl.importClause) {
      if (decl.importClause.name) {
        // This is of the form `import Name from 'path'`.
        console.log(3, decl.importClause.name.text);
      } else if (decl.importClause.namedBindings) {
        const nb = decl.importClause.namedBindings;
        if (nb.kind == ts.SyntaxKind.NamespaceImport) {
          // This is of the form `import * as name from 'path'`.
        console.log(5, nb.getFullText(file.sourceFile))
        } else {
          // This is of the form `import {a,b,c} from 'path'`
          const namedImports = nb as ts.NamedImports;

          return namedImports.elements
            .map((is: ts.ImportSpecifier) => {
              return new Import(
                is.propertyName ? is.propertyName.text : is.name.text,
                is.name.text, modulePath, decl, file);
            });
        }
      }
    } else {
      // This is of the form `import 'path';`. Nothing to do.
    }
    return [];
  }
}
