import * as fs from 'fs';
import * as path from 'path';


export interface RefactoryHost {
  readonly basePath: string;

  stat(filePath: string): fs.Stats | null;

  write(filePath: string, content: string): void;
  read(filePath: string): string;
  exists(filePath: string): boolean;

  list(dirPath: string): string[];
  isDirectory(dirPath: string): boolean;
}


export class InvalidRefactoryHost implements RefactoryHost {
  get basePath(): string { throw new Error('Unimplemented: basePath'); }

  write(filePath: string, content: string): void { throw new Error('Unimplemented: write'); }
  read(filePath: string): string { throw new Error('Unimplemented: read'); }
  exists(filePath: string): boolean { throw new Error('Unimplemented: exists'); }

  list(dirPath: string): string[] { throw new Error('Unimplemented: list'); }
  isDirectory(dirPath: string): boolean { throw new Error('Unimplemented: isDirectory'); }

  stat(dirPath: string): fs.Stats { throw new Error('Unimplemented: stat'); }
}


export class NullRefactoryHost implements RefactoryHost {
  constructor(public readonly basePath: string) {}

  write(filePath: string, content: string): void { throw new Error('Unimplemented: write'); }
  read(filePath: string): string { throw new Error('Unimplemented: read'); }
  exists(filePath: string): boolean { return false; }

  list(dirPath: string): string[] { return []; }
  isDirectory(dirPath: string): boolean { return false; }

  stat(dirPath: string): fs.Stats { return null; }
}


export class NodeRefactoryHost implements RefactoryHost {
  constructor(private _basePath: string = '/') {}
  private _normalize(p: string) {
    return path.normalize(path.isAbsolute(p) ? p : path.join(this._basePath, p));
  }

  get basePath(): string { return this._basePath; }

  stat(filePath: string): fs.Stats {
    return fs.statSync(filePath);
  }

  write(filePath: string, content: string): void {
    fs.writeFileSync(this._normalize(filePath), content, 'utf8');
  }
  read(filePath: string): string {
    return fs.readFileSync(this._normalize(filePath), 'utf8');
  }
  exists(filePath: string): boolean {
    return fs.existsSync(this._normalize(filePath));
  }
  list(dirPath: string): string[] {
    return fs.readdirSync(this._normalize(dirPath));
  }
  isDirectory(dirPath: string): boolean {
    return fs.statSync(this._normalize(dirPath)).isDirectory();
  }
}
