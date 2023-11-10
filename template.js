const typescript = require('./typescript.js');
const processUtil = require('./process.js');

const util = require('./utils.js');

const template = {
    /**
     * @name generateTemplate
     * @description [descripción de la funcion]
     * @return {void}
     */
    generateTemplate: function (fileContent, currentFileComponentPath) {
        debugger;
        const importsTemplate = this.searchImports(fileContent);
        const uniqueServices = this.getServices(fileContent);
        const className = this.getClassName(fileContent);

        const { methods, properties } =
            typescript.searchMethodsProperties(fileContent);

        let testTemplate = processUtil.startProcess(
            methods,
            uniqueServices,
            properties
        );

        let isChangeDetectorRef = fileContent.includes('ChangeDetectorRef');
        let isDetectorRefChanges = fileContent.includes('.detectChanges()');

        /********************************* PRINTS ************************************ */

        // printLetServicess
        const printLetServicess = (array) => {
            if (!array.length) {
                return '';
            }

            return array
                .map(
                    (s) => `    let ${s.name}: ${s.service};
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
                    (s) => `        ${s.name} = TestBed.inject(${s.service});
`
                )
                .join('')
                .trim();
        }; // end print TestBed.inject services

        const fakeAsyncTemplate = testTemplate.isTimeout
            ? ', fakeAsync, tick'
            : '';

        const testContent = `
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, ComponentFixture${fakeAsyncTemplate} } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { JwtHelperService, JwtModule } from '@auth0/angular-jwt';
${
    isChangeDetectorRef
        ? "import { ChangeDetectorRef } from '@angular/core';"
        : ''
}
${importsTemplate}
             
// testable component
import { ${className} } from './${currentFileComponentPath}';

describe('${className}', () => {
    let component: ${className};
    let fixture: ComponentFixture<${className}>;
    ${printLetServicess(uniqueServices)}
    ${isChangeDetectorRef ? 'let changeDetectorRef: ChangeDetectorRef;' : ''}

    beforeEach(() => {
        TestBed.configureTestingModule({
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            declarations: [${className}],
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
        fixture = TestBed.createComponent(${className});
        component = fixture.componentInstance;
        ${printTestBedServicess(uniqueServices)}
        ${
            isChangeDetectorRef
                ? 'changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);'
                : ''
        }
        ${
            isDetectorRefChanges
                ? `spyOn(
        fixture.debugElement.injector.get(ChangeDetectorRef).constructor
        .prototype,
        'detectChanges'
        );`
                : ''
        }
    });

    it('should load component as expected', () => {
        expect(component).toBeTruthy();
    });

${testTemplate.template}
});
`;

        return testContent;
    },

    /**
     * @name searchImports
     * @description [descripción de la funcion]
     * @return {void}
     */
    searchImports: function (fileContent) {
        // para leer las importaciones
        const regex = /[\s\S]*?@Component/;
        const matched = fileContent.match(regex);

        if (matched) {
            // Esto imprimirá todo desde el inicio hasta "@Component"
            let imports = matched[0].replace('@Component', '');

            // optimizamos los imports
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
                .filter((x) => x.toLowerCase().includes('service'))
                .sort();
            importArray = importArray.filter(
                (x) => !servicesImports.includes(x)
            );

            let modelsImports = importArray
                .filter((x) => x.includes('.model'))
                .sort();
            importArray = importArray.filter((x) => !modelsImports.includes(x));

            let enumImports = importArray
                .filter((x) => x.includes('.enum'))
                .sort();
            importArray = importArray.filter((x) => !enumImports.includes(x));

            let kendoImports = importArray
                .filter((x) => x.includes('kendo-'))
                .sort();
            importArray = importArray.filter((x) => !kendoImports.includes(x));

            let rxjsImports = importArray
                .filter((x) => x.includes('rxjs'))
                .sort();
            importArray = importArray.filter((x) => !rxjsImports.includes(x));

            return `${this.printImports(importArray, 'others')}
${this.printImports(kendoImports, 'kendo')}
${this.printImports(servicesImports, 'services')}
${this.printImports(modelsImports, 'models')}
${this.printImports(enumImports, 'enums')}
${this.printImports(rxjsImports, 'rxjs')}
`;
        }
    },

    /**
     * @name printImports
     * @description [descripción de la funcion]
     * @return {void}
     */
    printImports: function (array, comment) {
        return !array || !array.length
            ? ''
            : `${'// ' + comment}
${array.join('\n').trim()}
`;
    },

    /**
     * @name getServices
     * @description get the services on the component constructor
     * @return {void}
     */
    getServices: function (fileContent) {
        // para leer las importaciones
        const regex = /[\s\S]*?@Component/;
        const matched = fileContent.match(regex);

        if (matched) {
            // Esto imprimirá todo desde el inicio hasta "@Component"
            let imports = matched[0].replace('@Component', '');

            // optimizamos los imports
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
                .filter((x) => x.toLowerCase().includes('service'))
                .sort();
            importArray = importArray.filter(
                (x) => !servicesImports.includes(x)
            );

            // obtenemos los nombres de los servicios importados
            const regexServicesNames = /{\s*([^\s]+)\s*}/;
            let servicesNames = servicesImports
                .map((servicesName) => {
                    servicesName = servicesName.match(regexServicesNames);
                    if (servicesName) {
                        return servicesName
                            .pop()
                            .replace('{', '')
                            .replace('}', '')
                            .trim();
                    } else {
                        return null;
                    }
                })
                .filter((s) => s);

            // obtenemos los nombres de los servicios desde el constructor
            const regexServicesConstructorNames = /constructor\(([\s\S]+?)\)/;

            let servicesConstructorNames = [];

            if (fileContent.includes('constructor(')) {
                const searchConstructor = fileContent.match(
                    regexServicesConstructorNames
                );

                if (searchConstructor && searchConstructor.length) {
                    const firstConstructor = searchConstructor[0].trim();

                    let cleanConstructor = firstConstructor
                        .replace('constructor(', '')
                        .replace(')', '')
                        .replace(/\r\n/gim, '');

                    const arrayServicesConstructor =
                        cleanConstructor.split(',');
                    servicesConstructorNames = arrayServicesConstructor.map(
                        (aServiceName) => {
                            let data = aServiceName.split(':');
                            data = data.map((service) =>
                                service
                                    .trim()
                                    .replace('private', '')
                                    .replace('public', '')
                                    .trim()
                            );

                            return {
                                name: data[0],
                                service: data[1],
                            };
                        }
                    );
                }
            }

            let myServices = servicesNames.filter(
                (serviceName) =>
                    !servicesConstructorNames
                        .map((s) => s.service)
                        .includes(serviceName) &&
                    !serviceName.includes('Renderer2') &&
                    !serviceName.includes('ChangeDetectorRef')
            );

            myServices = myServices.map((serviceName) => ({
                name: util.transformString(serviceName),
                service: serviceName,
            }));

            let uniqueServices = [
                ...myServices,
                ...servicesConstructorNames.filter(
                    (serviceName) =>
                        serviceName.service &&
                        !serviceName.service.includes('Renderer2') &&
                        !serviceName.service.includes('ChangeDetectorRef')
                ),
            ].sort();

            return uniqueServices;
        }

        return [];
    },

    /**
     * @name getClassName
     * @description [descripción de la funcion]
     * @return {void}
     */
    getClassName: function (fileContent) {
        // obtenemos el nombre de la clase
        const regexClassName = /export class (\s|\w)+/;

        let className = fileContent.match(regexClassName);

        if (className) {
            className = className[0].replace('export class ', '').trim();

            if (className.includes('implements')) {
                className = className
                    .split('implements')
                    .reverse()
                    .pop()
                    .trim();
            }
        }

        return className;
    },
};
module.exports = template;
