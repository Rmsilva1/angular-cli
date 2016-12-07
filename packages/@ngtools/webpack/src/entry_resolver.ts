import * as fs from 'fs';
import {join} from 'path';
import * as ts from 'typescript';

import {Refactory, TypeScriptFile} from '@ngtools/refactory';
import {FunctionDeclaration} from '../../refactory/src/language/typescript/function';


function _recursiveSymbolExportLookup(symbolName: string,
                                      file: TypeScriptFile,
                                      refactory: Refactory,
                                      host: ts.CompilerHost): string | null {
  // Check this file.
  const hasSymbol = file.findAstNodes(null, ts.SyntaxKind.ClassDeclaration)
    .some((cd: ts.ClassDeclaration) => {
      return cd.name && cd.name.text == symbolName;
    });
  if (hasSymbol) {
    return file.path;
  }

  // We found the bootstrap variable, now we just need to get where it's imported.
  const exports = file.findAstNodes(null, ts.SyntaxKind.ExportDeclaration)
    .map(node => node as ts.ExportDeclaration);

  for (const decl of exports) {
    if (!decl.moduleSpecifier || decl.moduleSpecifier.kind !== ts.SyntaxKind.StringLiteral) {
      continue;
    }

    const modulePath = (decl.moduleSpecifier as ts.StringLiteral).text;
    const resolvedModule = ts.resolveModuleName(
      modulePath, file.path, refactory.program.getCompilerOptions(), host);
    if (!resolvedModule.resolvedModule || !resolvedModule.resolvedModule.resolvedFileName) {
      return null;
    }

    const module = resolvedModule.resolvedModule.resolvedFileName;
    if (!decl.exportClause) {
      const moduleRefactor = refactory.getFile(module, TypeScriptFile);
      const maybeModule = _recursiveSymbolExportLookup(symbolName, moduleRefactor, refactory, host);
      if (maybeModule) {
        return maybeModule;
      }
      continue;
    }

    const binding = decl.exportClause as ts.NamedExports;
    for (const specifier of binding.elements) {
      if (specifier.name.text == symbolName) {
        // If it's a directory, load its index and recursively lookup.
        if (fs.statSync(module).isDirectory()) {
          const indexModule = join(module, 'index.ts');
          if (fs.existsSync(indexModule)) {
            const file = refactory.getFile(indexModule, TypeScriptFile);
            const maybeModule = _recursiveSymbolExportLookup(symbolName, file, refactory, host);
            if (maybeModule) {
              return maybeModule;
            }
          }
        }

        // Create the source and verify that the symbol is at least a class.
        const source = new refactory.getFile(module, TypeScriptFile);
        const hasSymbol = source.findAstNodes(null, ts.SyntaxKind.ClassDeclaration)
          .some((cd: ts.ClassDeclaration) => {
            return cd.name && cd.name.text == symbolName;
          });

        if (hasSymbol) {
          return module;
        }
      }
    }
  }

  return null;
}

function _symbolImportLookup(symbolName: string,
                             file: TypeScriptFile,
                             refactory: Refactory,
                             host: ts.CompilerHost): string | null {
  // We found the bootstrap variable, now we just need to get where it's imported.
  const imports = file.findAstNodes(null, ts.SyntaxKind.ImportDeclaration)
    .map(node => node as ts.ImportDeclaration);

  for (const decl of imports) {
    if (!decl.importClause || !decl.moduleSpecifier) {
      continue;
    }
    if (decl.moduleSpecifier.kind !== ts.SyntaxKind.StringLiteral) {
      continue;
    }

    const resolvedModule = ts.resolveModuleName(
      (decl.moduleSpecifier as ts.StringLiteral).text, file.path, refactory.program, host);
    if (!resolvedModule.resolvedModule || !resolvedModule.resolvedModule.resolvedFileName) {
      return null;
    }

    const module = resolvedModule.resolvedModule.resolvedFileName;
    if (decl.importClause.namedBindings.kind == ts.SyntaxKind.NamespaceImport) {
      const binding = decl.importClause.namedBindings as ts.NamespaceImport;
      if (binding.name.text == symbolName) {
        // This is a default export.
        return module;
      }
    } else if (decl.importClause.namedBindings.kind == ts.SyntaxKind.NamedImports) {
      const binding = decl.importClause.namedBindings as ts.NamedImports;
      for (const specifier of binding.elements) {
        if (specifier.name.text == symbolName) {
          // Create the source and recursively lookup the import.
          const source = refactory.getFile(module);
          const maybeModule = _recursiveSymbolExportLookup(symbolName, source, refactory, host);
          if (maybeModule) {
            return maybeModule;
          }
        }
      }
    }
  }
  return null;
}


export function resolveEntryModuleFromMain(mainPath: string,
                                           refactory: Refactory,
                                           host: ts.CompilerHost) {
  const file: TypeScriptFile = refactory.getFile(mainPath, TypeScriptFile);
  if (!file) {
    throw new Error(`Could not load file path "${mainPath}".`);
  }

  const angular
  const bootstrapping = file.findCallsTo(refactory.getSymbol('', '', FunctionDeclaration))


  const bootstrap = file.findAstNodes(file.sourceFile, ts.SyntaxKind.CallExpression, true)
    .map(node => node as ts.CallExpression)
    .filter(call => {
      const access = call.expression as ts.PropertyAccessExpression;
      return access.kind == ts.SyntaxKind.PropertyAccessExpression
          && access.name.kind == ts.SyntaxKind.Identifier
          && (access.name.text == 'bootstrapModule'
              || access.name.text == 'bootstrapModuleFactory');
    })
    .map(node => node.arguments[0] as ts.Identifier)
    .filter(node => node.kind == ts.SyntaxKind.Identifier);

  if (bootstrap.length != 1) {
    throw new Error('Tried to find bootstrap code, but could not. Specify either '
      + 'statically analyzable bootstrap code or pass in an entryModule '
      + 'to the plugins options.');
  }

  const bootstrapSymbolName = bootstrap[0].text;
  const module = _symbolImportLookup(bootstrapSymbolName, file, refactory, host);
  if (module) {
    return `${module.replace(/\.ts$/, '')}#${bootstrapSymbolName}`;
  }

  // shrug... something bad happened and we couldn't find the import statement.
  throw new Error('Tried to find bootstrap code, but could not. Specify either '
    + 'statically analyzable bootstrap code or pass in an entryModule '
    + 'to the plugins options.');
}
