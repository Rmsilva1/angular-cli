import {File} from './file';


export class StaticSymbol {
  constructor(protected _name: string, protected _file: File) {}

  get file() { return this._file; }
  get name() { return this._name; }
}

export class UnknownStaticSymbol extends StaticSymbol {}
