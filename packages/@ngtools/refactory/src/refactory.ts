import * as ts from 'typescript';
import {dirname} from 'path';

import {Constructor} from './definitions';
import {File, UnknownFile, NonExistentFile} from './language/file';
import {RefactoryHost, NodeRefactoryHost} from './host';
import {RefactoryCompilerHostAdapter, RefactoryParseConfigHostAdapter} from './utils/host_adapters';
import {TypeScriptFile} from './language/typescript/file';
import {Path, resolvePathFromSystemPath} from './path';
import {StaticSymbol} from './language/symbol';


export class Refactory {
  private _fileCache: {[path: string]: File} = Object.create(null);

  private constructor(public readonly basePath: string,
                      private _program: ts.Program,
                      private _host: RefactoryHost) {}

  /**
   * Create a Refactory instance from a tsconfig.json file.
   * @param tsConfigPath The path of the tsconfig.json file.
   * @param host The host to use to access the file system.
   */
  static fromTsConfig(tsConfigPath: Path, host: RefactoryHost = null) {
    let basePath = tsConfigPath as string;
    const stat = host.stat(basePath);
    if (!stat) {
      throw new Error(`Invalid tsconfig path: "${tsConfigPath}".`);
    }

    if (stat.isFile()) {
      basePath = dirname(basePath);
    }

    if (host === null) {
      host = new NodeRefactoryHost(basePath);
    }

    const parseConfigHost = new RefactoryParseConfigHostAdapter(host);
    const tsConfigJson = JSON.parse(host.read(tsConfigPath));
    const tsConfig = ts.parseJsonConfigFileContent(tsConfigJson, parseConfigHost, basePath);
    if (tsConfig.errors.length > 0) {
      const message = tsConfig.errors
        .map(diagnostic => {
          const {line, character} = diagnostic.file
            ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
            : {line: -1, character: -1};
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          return diagnostic.file ? diagnostic.file.fileName : 'unknown'
                + ` (${line + 1},${character + 1}): ${message})`;
        })
        .join('\n');

      throw new Error(message);
    }

    const compilerHost = new RefactoryCompilerHostAdapter(host, tsConfig.options);
    const program = ts.createProgram(tsConfig.fileNames, tsConfig.options, compilerHost);
    return new Refactory(basePath, program, host);
  }

  static fromProgram(program: ts.Program, host: RefactoryHost) {
    const basePath = program.getCompilerOptions().baseUrl;
    return new Refactory(basePath, program, host);
  }

  static pathFromSystem(p: string, containingFile: Path | null = null) {
    return resolvePathFromSystemPath(p, containingFile, null);
  }

  private _createFile(path: Path): File {
    const tsf = this._program.getSourceFile(path as string);
    if (tsf) {
      return new TypeScriptFile(path, tsf, this);
    }

    return this._host.exists(path)
      ? new UnknownFile(path, this)
      : new NonExistentFile(path, this);
  }

  get host() { return this._host; }
  get program() { return this._program; }

  resolvePath(filePath: string, containingFile: Path | null): Path {
    return resolvePathFromSystemPath(filePath, containingFile, this);
  }

  getSymbolDeclaration(filePath: Path, symbolName: string): StaticSymbol | null;
  getSymbolDeclaration<T extends StaticSymbol>(filePath: Path,
                                         symbolName: string,
                                         TypeCtor?: Constructor<T>): T | StaticSymbol | null {
    const file = this.getFile(filePath);
    const symbol = file.resolveSymbol(symbolName);
    if (TypeCtor) {
      return (symbol instanceof TypeCtor) ? symbol as T : null;
    }
    return symbol as StaticSymbol || null;
  }

  getFile(filePath: Path): File | null;
  getFile<T extends File>(filePath: Path, TypeCtor?: Constructor<T>): T | File | null {
    const p = filePath as string;
    if (!(p in this._fileCache)) {
      this._fileCache[p] = this._createFile(filePath);
    }

    const f = this._fileCache[p];
    if (TypeCtor) {
      return (f instanceof TypeCtor) ? f as T : null;
    }
    return f as File || null;
  }
}
