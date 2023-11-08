const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

const ts = require('typescript');
const process = require('./process.js');
console.log(process);

function transformString(str) {
    const regex = /^[A-Z]+|[^A-Z]*[A-Z]/g;

    const matches = str.match(regex);

    if (matches) {
        if (matches[0].length == 1) {
            return str;
        } else {
            let start = matches[0];
            str = str.replace(start, '');
            let letters = start.split('');
            let last = letters.pop();
            let text = letters.join('').toLowerCase() + last + str;

            return text;
        }
    }
}

function activate(context) {
    let disposable = vscode.commands.registerCommand(
        'extension.jestGeneratorEka',
        async function () {
            // Obtener el archivo activo
            const activeTextEditor = vscode.window.activeTextEditor;

            if (activeTextEditor) {
                const currentFilePath = activeTextEditor.document.uri.fsPath;

                const extension = currentFilePath.substring(
                    currentFilePath.indexOf('.'),
                    currentFilePath.length
                );

                // validamos que la extension del archivo sea la correcta
                if (extension.includes('ts')) {
                    const testFilePath = currentFilePath.replace(
                        '.ts',
                        '.spec.ts'
                    );
                    const directorySeparator = path.sep;
                    const currentFileComponentPath = currentFilePath
                        .substring(
                            currentFilePath.lastIndexOf(directorySeparator),
                            currentFilePath.length
                        )
                        .replace(directorySeparator, '')
                        .replace('.ts', '');

                    // validamos si el archivo de pruebas existe sino lo creamos
                    if (!fs.existsSync(testFilePath)) {
                        vscode.window.showInformationMessage(
                            `Test file does not exist and was generated.`
                        );

                        const activeTextEditor = vscode.window.activeTextEditor;

                        if (activeTextEditor) {
                            let fileContent =
                                activeTextEditor.document.getText();

                            // para leer las importaciones
                            const regex = /[\s\S]*?@Component/;
                            const matched = fileContent.match(regex);

                            if (matched) {
                                // Esto imprimirá todo desde el inicio hasta "@Component"
                                let imports = matched[0].replace(
                                    '@Component',
                                    ''
                                );

                                // optimizamos los imports

                                // let importArray = imports
                                // .split('\n')
                                // .map((x) => x.trim())
                                // .filter(
                                //     (x) =>
                                //         x.startsWith('import') &&
                                //         !x.includes('@angular/core')
                                // );

                                const regexImports = /import [\s\S]+?;/g;
                                let importArray = imports
                                    .match(regexImports)
                                    .map((x) => x.trim())
                                    .filter(
                                        (x) =>
                                            x.startsWith('import') &&
                                            !x.includes('@angular/core') &&
                                            !x.includes('Renderer2')
                                    );

                                let servicesImports = importArray
                                    .filter((x) =>
                                        x.toLowerCase().includes('service')
                                    )
                                    .sort();
                                importArray = importArray.filter(
                                    (x) => !servicesImports.includes(x)
                                );

                                let modelsImports = importArray
                                    .filter((x) => x.includes('.model'))
                                    .sort();
                                importArray = importArray.filter(
                                    (x) => !modelsImports.includes(x)
                                );

                                let enumImports = importArray
                                    .filter((x) => x.includes('.enum'))
                                    .sort();
                                importArray = importArray.filter(
                                    (x) => !enumImports.includes(x)
                                );

                                let kendoImports = importArray
                                    .filter((x) => x.includes('kendo-'))
                                    .sort();
                                importArray = importArray.filter(
                                    (x) => !kendoImports.includes(x)
                                );

                                let rxjsImports = importArray
                                    .filter((x) => x.includes('rxjs'))
                                    .sort();
                                importArray = importArray.filter(
                                    (x) => !rxjsImports.includes(x)
                                );

                                // obtenemos los nombres de los servicios importados
                                const regexServicesNames = /{\s*([^\s]+)\s*}/;
                                let servicesNames = servicesImports.map((x) =>
                                    x
                                        .match(regexServicesNames)
                                        .pop()
                                        .replace('{', '')
                                        .replace('}', '')
                                        .trim()
                                );

                                // obtenemos los nombres de los servicios desde el constructor
                                const regexServicesConstructorNames =
                                    /constructor\(([\s\S]+?)\)/;

                                let servicesConstructorNames =
                                    fileContent.includes('constructor(')
                                        ? fileContent
                                              .match(
                                                  regexServicesConstructorNames
                                              )
                                              .pop()
                                              .replace('constructor(', '')
                                              .replace(')', '')
                                              .split(',')
                                              .map((x) => {
                                                  let data = x
                                                      .split(':')
                                                      .map((s) =>
                                                          s
                                                              .trim()
                                                              .replace(
                                                                  'private',
                                                                  ''
                                                              )
                                                              .replace(
                                                                  'public',
                                                                  ''
                                                              )
                                                              .trim()
                                                      );

                                                  return {
                                                      name: data[0],
                                                      service: data[1],
                                                  };
                                              })
                                        : [];

                                let myServices = servicesNames.filter(
                                    (x) =>
                                        !servicesConstructorNames
                                            .map((s) => s.service)
                                            .includes(x) &&
                                        !x.includes('Renderer2') &&
                                        !x.includes('ChangeDetectorRef')
                                );

                                myServices = myServices.map((s) => ({
                                    name: transformString(s),
                                    service: s,
                                }));

                                let uniqueServices = [
                                    ...myServices,
                                    ...servicesConstructorNames.filter(
                                        (x) =>
                                            x.service &&
                                            !x.service.includes('Renderer2') &&
                                            !x.service.includes(
                                                'ChangeDetectorRef'
                                            )
                                    ),
                                ].sort();

                                // obtenemos el nombre de la clase
                                const regexClassName = /export class (\s|\w)+/;

                                let claseName =
                                    fileContent.match(regexClassName);

                                if (claseName) {
                                    claseName = claseName[0]
                                        .replace('export class ', '')
                                        .trim();

                                    if (claseName.includes('implements')) {
                                        claseName = claseName
                                            .split('implements')
                                            .reverse()
                                            .pop()
                                            .trim();
                                    }

                                    // buscamos todos los metodos

                                    const sourceCode = fileContent;

                                    const sourceFile = ts.createSourceFile(
                                        'temp.ts',
                                        sourceCode,
                                        ts.ScriptTarget.Latest,
                                        true,
                                        ts.ScriptKind.TS
                                    );

                                    //                                     const methodNames = [];
                                    //
                                    //                                     const visitNode = (node) => {
                                    //                                         if (
                                    //                                             ts.isMethodDeclaration(node) &&
                                    //                                             node.name &&
                                    //                                             ts.isIdentifier(node.name)
                                    //                                         ) {
                                    //                                             methodNames.push(node.name.text);
                                    //                                         }
                                    //
                                    //                                         ts.forEachChild(node, visitNode);
                                    //                                     };
                                    //
                                    //                                     visitNode(sourceFile);
                                    //
                                    //                                     console.log(methodNames);

                                    const methods = {};
                                    const properties = {};

                                    function visitNode(node) {
                                        if (
                                            ts.isMethodDeclaration(node) &&
                                            node.name &&
                                            ts.isIdentifier(node.name)
                                        ) {
                                            const methodName = node.name.text;
                                            const methodText =
                                                sourceCode.substring(
                                                    node.pos,
                                                    node.end
                                                );

                                            const parameters =
                                                node.parameters.map((param) => {
                                                    const paramName =
                                                        param.name.getText();
                                                    const paramType = param.type
                                                        ? param.type.getText()
                                                        : 'any';
                                                    return {
                                                        name: paramName,
                                                        type: paramType,
                                                    };
                                                });

                                            const returnType = node.type
                                                ? node.type.getText()
                                                : 'void';

                                            methods[methodName] = {
                                                code: methodText,
                                                parameters: parameters,
                                                returnType: returnType,
                                            };
                                        }

                                        if (ts.isClassDeclaration(node)) {
                                            for (const member of node.members) {
                                                if (
                                                    ts.isPropertyDeclaration(
                                                        member
                                                    )
                                                ) {
                                                    const name =
                                                        member.name.getText(
                                                            sourceFile
                                                        );
                                                    const type = member.type
                                                        ? member.type.getText(
                                                              sourceFile
                                                          )
                                                        : 'any'; // Si no se especifica un tipo, asume 'any'
                                                    properties[name] = type;
                                                }
                                            }
                                        }

                                        ts.forEachChild(node, visitNode);
                                    }

                                    //                                     function visitNode(node) {
                                    //                                         if (
                                    //                                             ts.isMethodDeclaration(node) &&
                                    //                                             node.name &&
                                    //                                             ts.isIdentifier(node.name)
                                    //                                         ) {
                                    //                                             const methodName = node.name.text;
                                    //                                             const methodText =
                                    //                                                 sourceCode.substring(
                                    //                                                     node.pos,
                                    //                                                     node.end
                                    //                                                 );
                                    //                                             methods[methodName] = methodText;
                                    //                                         }
                                    //
                                    //                                         ts.forEachChild(node, visitNode);
                                    //                                     }

                                    visitNode(sourceFile);

                                    let testTemplate = process.processMethods(
                                        methods,
                                        uniqueServices,
                                        transformString,
                                        properties
                                    );

                                    let isChangeDetectorRef = fileContent.includes('ChangeDetectorRef');
                                    let isDetectorRefChanges = fileContent.includes('.detectChanges()');

                                    /********************************* PRINTS ************************************ */

                                    // printImports
                                    const printImports = (array, comment) => {
                                        if (!array.length) {
                                            return '';
                                        }
                                        return `
${array ? '// ' + comment : ''}
${array ? array.join('\n').trim() : ''}
`;
                                    }; // end printImports

                                    // printLetServicess
                                    const printLetServicess = (array) => {
                                        if (!array.length) {
                                            return '';
                                        }

                                        return array
                                            .map(
                                                (
                                                    s
                                                ) => `  let ${s.name}: ${s.service};
`
                                            )
                                            .join('')
                                            .trim();
                                    }; // end printLetServicess

                                    // print TestBed.inject services
                                    const printTestBedServicess = (array) => {
                                        if (!array.length) {
                                            return '';
                                        }

                                        return array
                                            .map(
                                                (
                                                    s
                                                ) => `    ${s.name} = TestBed.inject(${s.service});
`
                                            )
                                            .join('')
                                            .trim();
                                    }; // end print TestBed.inject services

                                    const testContent = `import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, ComponentFixture${
                                        testTemplate.isTimeout
                                            ? ', fakeAsync, tick'
                                            : ''
                                    } } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { JwtHelperService, JwtModule } from '@auth0/angular-jwt';
${isChangeDetectorRef? "import { ChangeDetectorRef } from '@angular/core';":''}
${printImports(importArray, 'others')}${printImports(
                                        kendoImports,
                                        'kendo'
                                    )}${printImports(
                                        servicesImports,
                                        'services'
                                    )}${printImports(
                                        modelsImports,
                                        'models'
                                    )}${printImports(
                                        enumImports,
                                        'enums'
                                    )}${printImports(rxjsImports, 'rxjs')}
                                 
// testable component
import { ${claseName} } from './${currentFileComponentPath}';

describe('${claseName}', () => {
  let component: ${claseName};
  let fixture: ComponentFixture<${claseName}>;
  ${printLetServicess(uniqueServices)}
  ${isChangeDetectorRef? "let changeDetectorRef: ChangeDetectorRef;":''}

  beforeEach(() => {
    TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      declarations: [${claseName}],
      imports: [
        TranslateModule.forRoot(),
        HttpClientTestingModule,
        RouterTestingModule,
        JwtModule.forRoot({
          config: {
            tokenGetter: () => {
              return '';
            },
          },
        }),
      ],
      providers: [JwtHelperService],
      teardown: { destroyAfterEach: false },
    });
    fixture = TestBed.createComponent(${claseName});
    component = fixture.componentInstance;
    ${printTestBedServicess(uniqueServices)}
    ${isChangeDetectorRef? "changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);":''}
    ${isDetectorRefChanges? `spyOn(
        fixture.debugElement.injector.get(ChangeDetectorRef).constructor
          .prototype,
        'detectChanges'
      );`:''}
  });

  it('should load component as expected', () => {
    expect(component).toBeTruthy();
  });
  
  ${testTemplate.template}
});
`;
                                    fs.writeFileSync(testFilePath, testContent);

                                    const uri = vscode.Uri.file(testFilePath);
                                    try {
                                        const document =
                                            await vscode.workspace.openTextDocument(
                                                uri
                                            );
                                        await vscode.window.showTextDocument(
                                            document
                                        );
                                    } catch (error) {
                                        vscode.window.showErrorMessage(
                                            `Error al abrir el archivo: ${error.message}`
                                        );
                                        console.error(error); // Esto mostrará más detalles en la consola del desarrollador
                                    }
                                }
                            } else {
                                console.log('No se encontró la coincidencia.');
                            }
                        }

                        vscode.window.showInformationMessage(
                            `Jest tests have been generated for: ${currentFilePath}`
                        );
                    } else {
                    }
                } else {
                    vscode.window.showInformationMessage(
                        'No active a compatible file.'
                    );
                }

                vscode.window.showInformationMessage(
                    `Jest tests have been generated for  ${extension}`
                );
            } else {
                vscode.window.showInformationMessage(
                    'No active file detected.'
                );
            }
        }
    );

    context.subscriptions.push(disposable);
}

exports.activate = activate;

function deactivate() {}

exports.deactivate = deactivate;
