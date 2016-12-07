import {Decorator} from './typescript/decorator';
import {TypeScriptFile} from './typescript/file';
import {Refactory} from '../refactory';
import {VirtualRefactoryHost} from '../utils/virtual_refactory_host';
import {NullRefactoryHost} from '../host';
import {Path} from '../path';


function pathOf(s: string) {
  return s as Path;
}


const tsFileSystem: {[path: string]: string} = {
  '/tsconfig.json': '{}',
  '/file.ts': `console.log('hello');`,
  '/file1.ts': `
    /**
     * @annotation
     */
    function MyAnnotation(obj: any) { return () => {}; }
    function NotAnnotation() { return () => {}; }
    function NotFunctionCall() {}
  
    @NotFunctionCall
    @NotAnnotation()
    @MyAnnotation({ hello: 'world' })
    class MyClass {}
    
    export class MyOther {}
  `,
  '/file2.ts': `
    import {Symbol11} from './import1_def';
    import * as Def from './import1_def';
    import DefaultImport from './import1_def';
    
    import 'import2_def';
  `,
  '/import1_def.ts': `
    export function Symbol11() {}
    export default function Symbol12() {}
  `,
  '/import2_def.ts': `
    export function Symbol21() {}
    export default function Symbol22() {}
  `,
  '/file3.ts': `
    import {someFunction} from './import3_def';
    
    const someArgs = 1;
    someFunction().someMethod(someArgs);
  `,
  '/import3_def.ts': `
    export function someFunction() {
      return someObject;
    }
    
    export class SomeClass {
      someMethod(arg: number) { return arg + 1; }
    }
    const someObject = new SomeClass();
  `
};


fdescribe('TypeScriptFile', () => {
  let refactory: Refactory;

  beforeEach(() => {
    const host = new VirtualRefactoryHost(new NullRefactoryHost('/'));
    for (const p of Object.keys(tsFileSystem)) {
      host.write(p, tsFileSystem[p]);
    }

    refactory = Refactory.fromTsConfig('/tsconfig.json', host);
  });

  it('works with a file', () => {
    let file: TypeScriptFile = refactory.getFile(pathOf('/file.ts'), TypeScriptFile);
    expect(file).not.toBeNull();
    expect(file.transpile({}).outputText).toMatch(/console.log\('hello'\)/);
  });

  describe('classes', () => {
    it('can see class names', () => {
      let file1: TypeScriptFile = refactory.getFile(pathOf('/file1.ts')) as TypeScriptFile;
      expect(file1.classes.map(c => c.name)).toEqual(['MyClass', 'MyOther']);
    });

    it('can see decorators', () => {
      let file1: TypeScriptFile = refactory.getFile(pathOf('/file1.ts')) as TypeScriptFile;
      // Should ignore NotAnnotation.
      expect(file1.classes[0].decorators.map((a: Decorator) => a.name))
        .toEqual(['NotFunctionCall', 'NotAnnotation', 'MyAnnotation']);
    });

    it('can remove()', () => {
      let file1: TypeScriptFile = refactory.getFile(pathOf('/file1.ts')) as TypeScriptFile;
      file1.classes[0].remove();

      const output = file1.transpile({}).outputText;
      expect(output).toContain('MyOther');
      expect(output).not.toContain('MyClass');
    });

    it('knows if its exported', () => {
      let file1: TypeScriptFile = refactory.getFile(pathOf('/file1.ts')) as TypeScriptFile;
      expect(file1.classes[0].isExported).toBe(false);
      expect(file1.classes[1].isExported).toBe(true);
    });
  });

  describe('imports', () => {
    it('understands imports', () => {
      let import1: TypeScriptFile = refactory.getFile(pathOf('/file2.ts')) as TypeScriptFile;
      expect(import1.imports.map(i => i.name)).toEqual(['Symbol11']);
    });
  });


  describe('symbols', () => {
    it('understands imports', () => {
      const file3: TypeScriptFile = refactory.getFile(pathOf('/file3.ts'), TypeScriptFile);
      // expect(file3).toBe
      const symbol = file3.resolveSymbol('someFunction', false);

      expect(symbol).not.toBeNull();
      // expect(import1.imports.map(i => i.name)).toEqual(['Symbol11']);
    });
  });
});
