import * as ts from 'typescript';
import {basename, dirname, join} from 'path';
import {SourceMapConsumer, SourceMapGenerator} from 'source-map';

import {Class} from './class';
import {FunctionDeclaration} from './function';
import {File} from '../file';
import {Refactory} from '../../refactory';
import {StaticSymbol} from '../symbol';
import {Import} from './import';
import {Path} from '../../path';

const MagicString = require('magic-string');


export interface TranspileOutput {
  outputText: string;
  sourceMap: any | null;
}


export class TypeScriptFile extends File {
  private _sourceString: any;
  private _sourceText: string;
  private _changed: boolean = false;

  get sourceFile() { return this._sourceFile; }
  get sourceText() { return this._sourceString.toString(); }

  constructor(fileName: Path, private _sourceFile: ts.SourceFile, refactory: Refactory) {
    super(fileName, refactory);

    if (!this._sourceFile) {
      throw new Error(`Source "${fileName}" was not found.`);
    }
    this._sourceText = this._sourceFile.getFullText(this._sourceFile);
    this._sourceString = new MagicString(this._sourceText);
  }

  /**
   * Collates the diagnostic messages for the current source file
   */
  getDiagnostics(): ts.Diagnostic[] {
    return ts.getPreEmitDiagnostics(this._refactory.program, this._sourceFile);
  }

  private _classes: Class[] = null;
  get classes() {
    if (!this._classes) {
      this._classes =
        this.findAstNodes(null, ts.SyntaxKind.ClassDeclaration)
          .map(node => Class.fromNode(node, this));
    }
    return this._classes;
  }

  private _functions: FunctionDeclaration[] = null;
  get functions() {
    if (!this._functions) {
      this._functions =
        this.findAstNodes(null, ts.SyntaxKind.FunctionDeclaration)
          .map(node => FunctionDeclaration.fromNode(node, this));
    }
    return this._functions;
  }

  private _imports: Import[] = null;
  get imports() {
    if (!this._imports) {
      this._imports =
        this.findAstNodes(null, ts.SyntaxKind.ImportDeclaration)
          .reduce((prev, node) => prev.concat(Import.importsFromNode(node, this)), []);
    }
    return this._imports;
  }

  /**
   * Find all nodes from the AST in the subtree of node of SyntaxKind kind.
   * @param node The root node to check, or null if the whole tree should be searched.
   * @param kind The kind of nodes to find.
   * @param recursive Whether to go in matched nodes to keep matching.
   * @param max The maximum number of items to return.
   * @return all nodes of kind, or [] if none is found
   */
  findAstNodes(node: ts.Node | null,
               kind: ts.SyntaxKind,
               recursive = false,
               max: number = Infinity): ts.Node[] {
    if (max == 0) {
      return [];
    }
    if (!node) {
      node = this._sourceFile;
    }

    let arr: ts.Node[] = [];
    if (node.kind === kind) {
      // If we're not recursively looking for children, stop here.
      if (!recursive) {
        return [node];
      }

      arr.push(node);
      max--;
    }

    if (max > 0) {
      for (const child of node.getChildren(this._sourceFile)) {
        this.findAstNodes(child, kind, recursive, max)
          .forEach((node: ts.Node) => {
            if (max > 0) {
              arr.push(node);
            }
            max--;
          });

        if (max <= 0) {
          break;
        }
      }
    }
    return arr;
  }

  appendAfter(node: ts.Node, text: string): void {
    this._sourceString.prependRight(node.getEnd(), text);
  }

  insertImport(symbolName: string, modulePath: Path): void {
    // Find all imports.
    const allImports = this.findAstNodes(this._sourceFile, ts.SyntaxKind.ImportDeclaration);
    const maybeImports = allImports
      .filter((node: ts.ImportDeclaration) => {
        // Filter all imports that do not match the modulePath.
        return node.moduleSpecifier.kind == ts.SyntaxKind.StringLiteral
          && (node.moduleSpecifier as ts.StringLiteral).text == modulePath;
      })
      .filter((node: ts.ImportDeclaration) => {
        // Remove import statements that are either `import 'XYZ'` or `import * as X from 'XYZ'`.
        const clause = node.importClause as ts.ImportClause;
        if (!clause || clause.name || !clause.namedBindings) {
          return false;
        }
        return clause.namedBindings.kind == ts.SyntaxKind.NamedImports;
      })
      .map((node: ts.ImportDeclaration) => {
        // Return the `{ ... }` list of the named import.
        return (node.importClause as ts.ImportClause).namedBindings as ts.NamedImports;
      });

    if (maybeImports.length) {
      // There's an `import {A, B, C} from 'modulePath'`.
      // Find if it's in either imports. If so, just return; nothing to do.
      const hasImportAlready = maybeImports.some((node: ts.NamedImports) => {
        return node.elements.some((element: ts.ImportSpecifier) => {
          return element.name.text == symbolName;
        });
      });
      if (hasImportAlready) {
        return;
      }
      // Just pick the first one and insert at the end of its identifier list.
      this.appendAfter(maybeImports[0].elements[maybeImports[0].elements.length - 1],
        `, ${symbolName}`);
    } else {
      // Find the last import and insert after.
      this.appendAfter(allImports[allImports.length - 1],
        `import {${symbolName}} from '${modulePath}';`);
    }
  }

  removeNode(node: ts.Node) {
    this._sourceString.remove(node.getStart(this._sourceFile), node.getEnd());
    this._changed = true;
  }

  removeNodes(...nodes: ts.Node[]) {
    nodes.forEach(node => this.removeNode(node));
  }

  replaceNode(node: ts.Node, replacement: string) {
    let replaceSymbolName: boolean = node.kind === ts.SyntaxKind.Identifier;
    this._sourceString.overwrite(node.getStart(this._sourceFile),
      node.getEnd(),
      replacement,
      replaceSymbolName);
    this._changed = true;
  }

  resolveFile(modulePath: string): File {
    // TODO: ts.resolveModuleName(modulePath, this.path, this.refactory.program.getCompilerOptions(), this.refactory.host);
    if (modulePath[0] == '.') {
      return this.refactory.getFile(join(dirname(this._filePath), modulePath + '.ts'));
    } else {
      return this.refactory.getFile(modulePath + '.ts');
    }
  }

  getSymbol(name: string, exportOnly: boolean = true): StaticSymbol {
    // Look for all declarations.
    for (const c of this.classes) {
      if (c.name == name && (!exportOnly || c.isExported)) {
        return c;
      }
    }
    for (const f of this.functions) {
      if (f.name == name && (!exportOnly || f.isExported)) {
        return f;
      }
    }

    // Look for imports.
    for (const i of this.imports) {
      if (i.name == name && (!exportOnly || i.isExported)) {
        return i;
      }
    }
    return null;
  }

  resolveSymbol(name: string, exportOnly: boolean = true): StaticSymbol {
    const symbol = this.getSymbol(name, exportOnly);
    if (symbol !== null && symbol instanceof Import) {
      return symbol.source;
    }

    return symbol;
  }

  sourceMatch(re: RegExp) {
    return this._sourceText.match(re) !== null;
  }

  transpile(compilerOptions: ts.CompilerOptions): TranspileOutput {
    const source = this.sourceText;
    const result = ts.transpileModule(source, {
      compilerOptions: Object.assign({}, compilerOptions, {
        sourceMap: true,
        inlineSources: false,
        inlineSourceMap: false,
        sourceRoot: ''
      }),
      fileName: this._filePath
    });

    if (result.sourceMapText) {
      const sourceMapJson = JSON.parse(result.sourceMapText);
      sourceMapJson.sources = [ this._filePath ];

      const consumer = new SourceMapConsumer(sourceMapJson);
      const map = SourceMapGenerator.fromSourceMap(consumer);
      if (this._changed) {
        const sourceMap = this._sourceString.generateMap({
          file: basename(this._filePath.replace(/\.ts$/, '.js')),
          source: this._filePath,
          hires: true,
        });
        map.applySourceMap(new SourceMapConsumer(sourceMap), this._filePath);
      }

      const sourceMap = map.toJSON();
      const fileName = process.platform.startsWith('win')
        ? this._filePath.replace(/\//g, '\\')
        : this._filePath;
      sourceMap.sources = [ fileName ];
      sourceMap.file = basename(fileName, '.ts') + '.js';
      sourceMap.sourcesContent = [ this._sourceText ];

      return { outputText: result.outputText, sourceMap };
    } else {
      return {
        outputText: result.outputText,
        sourceMap: null
      };
    }
  }
}
