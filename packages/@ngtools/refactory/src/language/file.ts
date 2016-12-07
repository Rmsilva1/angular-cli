import {Refactory} from '../refactory';
import {StaticSymbol} from './symbol';

export abstract class File {
  constructor(protected _filePath: string, protected _refactory: Refactory) {}

  get path() { return this._filePath; }
  get refactory() { return this._refactory; }

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
