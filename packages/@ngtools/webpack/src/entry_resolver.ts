import * as fs from 'fs';
import {join} from 'path';
import * as ts from 'typescript';

import {Refactory, TypeScriptFile} from '@ngtools/refactory';


export function resolveEntryModuleFromMain(mainPath: string,
                                           refactory: Refactory,
                                           host: ts.CompilerHost): string {
  const file: TypeScriptFile = refactory.getFile(refactory.resolvePath(mainPath, null)) as TypeScriptFile;
  if (!file) {
    throw new Error(`Could not load file path "${mainPath}".`);
  }

  const p = refactory.resolvePath(mainPath, null);
  const platformBrowserDynamicFile = file.resolveModule('@angular/platform-browser-dynamic');
  const symbol = platformBrowserDynamicFile.resolveSymbol('platformBrowserDynamic');

  const calls = file.findCallsTo(symbol);
  console.log(calls);

  // const bootstrap = file.findAstNodes(file.sourceFile, ts.SyntaxKind.CallExpression, true)
  //   .map(node => node as ts.CallExpression)
  //   .filter(call => {
  //     const access = call.expression as ts.PropertyAccessExpression;
  //     return access.kind == ts.SyntaxKind.PropertyAccessExpression
  //         && access.name.kind == ts.SyntaxKind.Identifier
  //         && (access.name.text == 'bootstrapModule'
  //             || access.name.text == 'bootstrapModuleFactory');
  //   })
  //   .map(node => node.arguments[0] as ts.Identifier)
  //   .filter(node => node.kind == ts.SyntaxKind.Identifier);
  //
  // if (bootstrap.length != 1) {
  //   throw new Error('Tried to find bootstrap code, but could not. Specify either '
  //     + 'statically analyzable bootstrap code or pass in an entryModule '
  //     + 'to the plugins options.');
  // }
  //
  // const bootstrapSymbolName = bootstrap[0].text;
  // const module = _symbolImportLookup(bootstrapSymbolName, file, refactory, host);
  // if (module) {
  //   return `${module.replace(/\.ts$/, '')}#${bootstrapSymbolName}`;
  // }

  // shrug... something bad happened and we couldn't find the import statement.
  throw new Error('Tried to find bootstrap code, but could not. Specify either '
    + 'statically analyzable bootstrap code or pass in an entryModule '
    + 'to the plugins options.');
}
