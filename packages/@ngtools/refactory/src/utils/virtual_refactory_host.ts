import {Stats} from 'fs';
import {basename, dirname, join} from 'path';
import * as ts from 'typescript';

import {RefactoryHost} from '../host';


export interface OnErrorFn {
  (message: string): void;
}


const dev = Math.floor(Math.random() * 10000);


export class VirtualStats implements Stats {
  protected _ctime = new Date();
  protected _mtime = new Date();
  protected _atime = new Date();
  protected _btime = new Date();
  protected _dev = dev;
  protected _ino = Math.floor(Math.random() * 100000);
  protected _mode = parseInt('777', 8);  // RWX for everyone.
  protected _uid = process.env['UID'] || 0;
  protected _gid = process.env['GID'] || 0;

  constructor(protected _path: string) {}

  isFile() { return false; }
  isDirectory() { return false; }
  isBlockDevice() { return false; }
  isCharacterDevice() { return false; }
  isSymbolicLink() { return false; }
  isFIFO() { return false; }
  isSocket() { return false; }

  get dev() { return this._dev; }
  get ino() { return this._ino; }
  get mode() { return this._mode; }
  get nlink() { return 1; }  // Default to 1 hard link.
  get uid() { return this._uid; }
  get gid() { return this._gid; }
  get rdev() { return 0; }
  get size() { return 0; }
  get blksize() { return 512; }
  get blocks() { return Math.ceil(this.size / this.blksize); }
  get atime() { return this._atime; }
  get mtime() { return this._mtime; }
  get ctime() { return this._ctime; }
  get birthtime() { return this._btime; }
}

export class VirtualDirStats extends VirtualStats {
  constructor(_fileName: string) {
    super(_fileName);
  }

  isDirectory() { return true; }

  get size() { return 1024; }
}

export class VirtualFileStats extends VirtualStats {
  private _sourceFile: ts.SourceFile;
  constructor(_fileName: string, private _content: string) {
    super(_fileName);
  }

  get content() { return this._content; }
  set content(v: string) {
    this._content = v;
    this._mtime = new Date();
  }
  getSourceFile(languageVersion: ts.ScriptTarget, setParentNodes: boolean) {
    if (!this._sourceFile) {
      this._sourceFile = ts.createSourceFile(
        this._path,
        this._content,
        languageVersion,
        setParentNodes);
    }

    return this._sourceFile;
  }

  isFile() { return true; }

  get size() { return this._content.length; }
}


export class VirtualRefactoryHost implements RefactoryHost {
  private _files: {[path: string]: VirtualFileStats} = Object.create(null);
  private _directories: {[path: string]: VirtualDirStats} = Object.create(null);
  private _changed = false;

  private _setParentNodes: boolean;

  constructor(private _delegate: RefactoryHost) {
    this._setParentNodes = true;
  }

  private _normalizePath(path: string) {
    return path.replace(/\\/g, '/');
  }

  private _resolve(path: string) {
    path = this._normalizePath(path);
    if (path[0] == '/' || path.match(/^\w:\//)) {
      return path;
    } else {
      return join(this.basePath, path);
    }
  }

  private _setFileContent(fileName: string, content: string) {
    this._files[fileName] = new VirtualFileStats(fileName, content);

    let p = dirname(fileName);
    while (p && !this._directories[p]) {
      this._directories[p] = new VirtualDirStats(p);
      p = dirname(p);
    }

    this._changed = true;
  }

  get dirty() { return this._changed; }
  resetDirtyFlag() { this._changed = false; }

  get basePath() { return this._delegate.basePath; }

  list(dirPath: string): string[] {
    const subs: {[path: string]: boolean} = {};
    this._delegate.list(dirPath).forEach(p => subs[p] = true);

    Object.keys(this._directories)
      .concat(Object.keys(this._files))
      .filter(fileName => dirname(fileName) == dirPath)
      .map(path => basename(path))
      .filter(x => !!x)
      .forEach(p => subs[p] = true);

    return Object.keys(subs);
  }

  isDirectory(dirPath: string): boolean {
    return this._resolve(dirPath) in this._directories || this._delegate.isDirectory(dirPath);
  }

  exists(fileName: string): boolean {
    fileName = this._resolve(fileName);
    return fileName in this._files || this._delegate.exists(fileName);
  }

  read(fileName: string): string {
    fileName = this._resolve(fileName);
    return (fileName in this._files)
      ? this._files[fileName].content
      : this._delegate.read(fileName);
  }

  stat(path: string): Stats {
    if (this._files[path]) {
      return this._files[path];
    } else if (this._directories[path]) {
      return this._directories[path];
    } else {
      return this._delegate.stat(path);
    }
  }

  write(path: string, content: string) {
    path = this._resolve(path);
    this._setFileContent(path, content);
  }
}
