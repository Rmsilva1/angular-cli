import * as ts from 'typescript';
import {win32, posix} from 'path';

import {Refactory} from './refactory';
import {RefactoryCompilerHostAdapter} from './utils/host_adapters';


export type Path = string & { __refactory_path: string };


export function isAbsolute(p: Path) {
  if (process.platform.startsWith('win')) {
    return win32.isAbsolute(p as string);
  } else {
    return posix.isAbsolute(p as string);
  }
}


export function resolvePathFromSystemPath(p: string,
                                          containingPath: Path | null,
                                          refactory: Refactory | null): Path {
  if (process.platform.startsWith('win')) {
    return resolvePathFromWindowsPath(p, containingPath, refactory);
  } else {
    return resolvePathFromPosixPath(p, containingPath, refactory);
  }
}


export function resolvePathFromWindowsPath(path: string,
                                           containingPath: Path | null,
                                           refactory: Refactory | null): Path {
  if (win32.isAbsolute(path)) {
    return path.replace(/\\/g, '/') as Path;
  } else if (path.startsWith('.')) {
    if (!containingPath) {
      throw new Error('Relative path without a containing module is impossible to resolve.');
    }
    return win32.join(win32.dirname(containingPath), path).replace(/\\/g, '/') as Path;
  } else {
    if (!refactory) {
      throw new Error('Library path without a refactory instance is impossible to resolve.');
    }

    const compilerOptions = refactory.program.getCompilerOptions();
    const host = new RefactoryCompilerHostAdapter(refactory.host, compilerOptions);
    const resolvedModule = ts.resolveModuleName(path, containingPath, compilerOptions, host);
    if (!resolvedModule.resolvedModule) {
      throw new Error(`Could not resolve "${path}" from "${containingPath}".`);
    }
    return resolvedModule.resolvedModule.resolvedFileName.replace(/\\/g, '/') as Path;
  }
}


export function resolvePathFromPosixPath(path: string,
                                         containingPath: Path | null,
                                         refactory: Refactory | null): Path {
  if (posix.isAbsolute(path)) {
    return path as Path;
  } else if (path.startsWith('.')) {
    console.log(path)
    if (!containingPath) {
      throw new Error('Relative path without a containing module is impossible to resolve.');
    }
    return posix.join(posix.dirname(containingPath), path) as Path;
  } else {
    if (!refactory) {
      throw new Error('Library path without a refactory instance is impossible to resolve.');
    }

    const compilerOptions = refactory.program.getCompilerOptions();
    const host = new RefactoryCompilerHostAdapter(refactory.host, compilerOptions);
    const resolvedModule = ts.resolveModuleName(path, containingPath, compilerOptions, host);
    if (!resolvedModule.resolvedModule) {
      throw new Error(`Could not resolve "${path}" from "${containingPath}".`);
    }
    return resolvedModule.resolvedModule.resolvedFileName as Path;
  }
}
