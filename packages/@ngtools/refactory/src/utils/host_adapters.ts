import * as minimatch from 'minimatch';
import * as path from 'path';
import * as ts from 'typescript';
import {RefactoryHost} from '../host';


export class RefactoryParseConfigHostAdapter implements ts.ParseConfigHost {
  constructor(private _host: RefactoryHost) {}

  get useCaseSensitiveFileNames(): boolean {
    return true;
  }

  private _match(rootDir: string,
                 extensions: string[],
                 excludes: string[],
                 matchers: minimatch.IMinimatch[]): Array<string> {
    return this._host.list(rootDir)
      .map(sub => path.join(rootDir, sub))
      // Extensions.
      .filter(p => extensions.indexOf(path.extname(p)) != -1)
      // Excludes.
      .filter(p => !(p.split(path.sep).some(subp => excludes.indexOf(subp) != -1)))
      // Includes.
      .filter(path => matchers.some(matcher => matcher.match(path)))
      // Recursively look for sub directories.
      .reduce((prev, curr) => {
        if (this._host.isDirectory(curr)) {
          return prev.concat(this._match(curr, extensions, excludes, matchers));
        } else {
          return prev.concat(curr);
        }
      }, []);
  }

  readDirectory(rootDir: string,
                extensions: string[],
                excludes: string[],
                includes: string[]): string[] {
    const matchers = includes.map(i => new minimatch.Minimatch(i));
    return this._match(rootDir, extensions, excludes, matchers);
  }

  /**
   * Gets a value indicating whether the specified path exists and is a file.
   * @param path The path to test.
   */
  fileExists(path: string): boolean {
    return this._host.exists(path);
  }
}


export class RefactoryCompilerHostAdapter implements ts.CompilerHost {
  private _compilerHost: ts.CompilerHost;

  constructor(private _host: RefactoryHost, private _options: ts.CompilerOptions) {
    this._compilerHost = ts.createCompilerHost(_options);
  }

  fileExists(fileName: string): boolean {
    return this._host.exists(fileName);
  }
  readFile(fileName: string): string {
    return this._host.read(fileName);
  }
  directoryExists?(directoryName: string): boolean {
    return this.fileExists(directoryName);
  }
  getCurrentDirectory(): string {
    return this._host.basePath;
  }
  getDirectories(dirPath: string): string[] {
    return this._host.list(dirPath).filter(p => {
      const pp = path.join(dirPath, p);
      return this._host.isDirectory(pp);
    });
  }

  getSourceFile(fileName: string,
                languageVersion: ts.ScriptTarget,
                onError?: (message: string) => void): ts.SourceFile {
    if (this._host.exists(fileName)) {
      return ts.createSourceFile(fileName, this._host.read(fileName), languageVersion, false);
    } else {
      return null;
    }
  }
  getDefaultLibFileName(options: ts.CompilerOptions): string {
    return this._compilerHost.getDefaultLibFileName(options);
  }
  getDefaultLibLocation(): string {
    return this._compilerHost.getDefaultLibLocation();
  }

  get writeFile() {
    return (fileName: string, data: string) => this._host.write(fileName, data);
  }

  getCanonicalFileName(fileName: string): string {
    return fileName;
  }
  get useCaseSensitiveFileNames(): () => boolean | boolean {
    return () => { return true; }
  }
  getNewLine(): string {
    return '\n';
  }
}
