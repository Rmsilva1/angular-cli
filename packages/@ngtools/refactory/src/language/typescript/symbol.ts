import * as ts from 'typescript';
import {File} from '../file';
import {StaticSymbol} from '../symbol';
import {TypeScriptFile} from './file';


export abstract class TypeScriptStaticSymbol<T extends ts.Node> extends StaticSymbol {
  protected _node: T;

  protected constructor(name: string, node: T, file: File) {
    if (!(file instanceof TypeScriptFile)) {
      throw new Error('Trying to create a typescript symbol from a non-typescript file.');
    }
    super(name, file);
    this._node = node;
  }

  abstract get isExported(): boolean;
  get file(): TypeScriptFile { return this._file as TypeScriptFile; }
  get node() { return this._node; }
  get text(): string { return this._node.getFullText(this.file.sourceFile); }

  remove() { this.file.removeNode(this._node); }
}

export class UnknownTypeScriptStaticSymbol extends TypeScriptStaticSymbol<null> {
  protected constructor(name: string, file: File) {
    super(name, null, file);
  }
}

