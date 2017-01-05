import {Refactory} from '../refactory';
import {StaticSymbol} from './symbol';
import {Path} from '../path';
import {Constructor} from '../definitions';

export abstract class File {
  constructor(protected _filePath: Path, protected _refactory: Refactory) {}

  get path(): string { return this._filePath as string; }
  get refactory() { return this._refactory; }

  as<T extends File>(ctor: Constructor<T>): T | null {
    return this instanceof ctor ? <T><any>this : null;
  }

  abstract resolveSymbol(name: string): StaticSymbol;
}

export class NonExistentFile extends File {
  resolveSymbol(name: string): StaticSymbol {
    throw new Error(`Trying to resolve symbol "${name}" in non existent file "${this.path}".`);
  }
}

export class UnknownFile extends File {
  resolveSymbol(name: string): StaticSymbol {
    throw new Error(`Trying to resolve symbol "${name}" in an unknown file language.`);
  }
}
