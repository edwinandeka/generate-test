const util = require('./utils.js');

const processUtil = {
    /**
     * @name startProcess
     * @description [descripción de la funcion]
     * @return {void}
     */
    startProcess: function (methods, services, properties) {
        this.methods = methods;
        this.services = services;
        this.properties = properties;

        //if necessary add fakeAsync and tick
        this.isTimeout = false;

        return this.processMethods();
    },

    /**
     * @name printMethodComments
     * @description [descripción de la funcion]
     * @return {void}
     */
    printMethodComments: function (methodName, isTimeoutMethod) {
        return `it('should run ${methodName} as expected', ${
            isTimeoutMethod ? 'fakeAsync(' : ''
        }() => {`;
    },

    /**
     * @name printParams
     * @description [descripción de la funcion]
     * @return {void}
     */
    printParams: function (params) {
        let template = '';
        params.forEach((p) => {
            template += `        const ${p.name}: ${
                p.type
            } = ${this.generateParamValue(p)};
`;
        });

        return template;
    },

    /**
     * @name printTestRun
     * @description [descripción de la funcion]
     * @return {void}
     */
    printTestRun: function (
        params,
        returnType,
        methodName,
        methodContent,
        isTimeoutMethod
    ) {
        let template = '        ';

        if (returnType != 'void') {
            template += `const result: ${returnType} = `;
        }

        let parameters = params.length
            ? params.map((p) => p.name).join(', ')
            : '';

        if (methodContent.includes('private')) {
            template += `component['${methodName}'](${parameters});
`;
        } else {
            template += `component.${methodName}(${parameters});
`;
        }

        if (isTimeoutMethod) {
            template += `tick(100);
`;
        }
        return template;
    },

    /**
     * @name printExpectedResult
     * @description [descripción de la funcion]
     * @return {void}
     */
    printExpectedResult: function (returnType) {
        if (returnType != 'void') {
            return `        const expectedResult: ${returnType} = ${this.generateParamValue(
                {
                    type: returnType,
                    name: 'expectedResult',
                }
            )}
`;
        }

        return '';
    },

    /**
     * @name processMethod
     * @description [descripción de la funcion]
     * @return {void}
     */
    processMethod: function (
        methodName,
        methodContent,
        params,
        returnType,
        otherMethods
    ) {
        // 1 ) check setTimeout

        const isTimeoutMethod = methodContent.includes('setTimeout');
        const isDetectorRefChanges = methodContent.includes('.detectChanges()');

        if (!this.isTimeout && isTimeoutMethod) {
            this.isTimeout = true;
        }

        // 2) check class properties
        const { templateProperties, templateOutcomesProperties } =
            this.generateTemplateProperties(methodContent);

        // 3) check spy
        //from methods
        const { templateSpyMethods, templateOutcomesSpyMethods } =
            this.generateTemplateSpyMethods(
                methodContent,
                otherMethods,
                methodName
            );

        //from services
        const { templateSpyServices, templateOutcomesSpyServices } =
            this.generateTemplateSpyServices(methodContent, params);

        //from emits
        const { templateSpyEmits, templateOutcomesSpyEmits } =
            this.generateTemplateSpyEmits(methodContent);

        let templateSubscriptions = '';
        let templateOutcomesSubscriptions = '';

        if (methodContent.includes('subscriptions.unsubscribe')) {
            templateSubscriptions += `        spyOn(component['subscriptions'], 'unsubscribe');`;
            templateOutcomesSubscriptions += `        expect(component['subscriptions'].unsubscribe).toHaveBeenCalledTimes(1);`;
        }

        // consts
        let constTemplate = '';
        if (params.length || templateProperties.length) {
            constTemplate += '        // consts\n';
        }

        if (params.length) {
            constTemplate += this.printParams(params);
        }
        if (templateProperties.length) {
            constTemplate += templateProperties;
        }

        if (returnType != 'void') {
            constTemplate += this.printExpectedResult(returnType);
        }

        // spy
        let spyTemplate = '';
        if (
            templateSpyMethods.trim().length ||
            templateSpyServices.trim().length ||
            templateSpyEmits.trim().length ||
            templateSubscriptions.trim().length
        ) {
            spyTemplate += '        // spy\n';
        }
        if (templateSpyMethods.length) {
            spyTemplate += templateSpyMethods;
        }
        if (templateSpyServices.length) {
            spyTemplate += templateSpyServices;
        }
        if (templateSpyEmits.length) {
            spyTemplate += templateSpyEmits;
        }
        if (templateSubscriptions.length) {
            spyTemplate += templateSubscriptions;
        }

        // outcomes
        let outcomesTemplate = '';
        if (isDetectorRefChanges) {
            outcomesTemplate +=
                '        expect(changeDetectorRef.detectChanges).toHaveBeenCalledTimes(1);';
        }

        if (templateOutcomesProperties.length) {
            outcomesTemplate += templateOutcomesProperties;
        }
        if (templateOutcomesSpyMethods.length) {
            outcomesTemplate += templateOutcomesSpyMethods;
        }
        if (templateOutcomesSpyServices.length) {
            outcomesTemplate += templateOutcomesSpyServices;
        }
        if (templateOutcomesSpyEmits.length) {
            outcomesTemplate += templateOutcomesSpyEmits;
        }
        if (templateOutcomesSubscriptions.length) {
            outcomesTemplate += templateOutcomesSubscriptions;
        }
        if (returnType != 'void') {
            outcomesTemplate +=
                '        expect(result).toStrictEqual(expectedResult);';
        }

        // ) generate the template
        let template = `
    ${this.printMethodComments(methodName, isTimeoutMethod)}
${constTemplate}
${spyTemplate}
        // test
${this.printTestRun(
    params,
    returnType,
    methodName,
    methodContent,
    isTimeoutMethod
)}
        // outcomes
${outcomesTemplate}
    })${isTimeoutMethod ? ')' : ''};
    
    `;

        return template;
    },

    /**
     * @name generateTemplateProperties
     * @description [descripción de la funcion]
     * @return {void}
     */
    generateTemplateProperties: function (methodContent) {
        let templateProperties = ``;
        let templateOutcomesProperties = ``;

        // validamos las asignaciones a la clase
        const regexProperties = new RegExp(
            `this\\s*\\.\\s*(\\w+)\\s*\\=\\s*(!||\\w+)*\\.*([\\w\\[\\]\\s{}:'",]+)`,
            'gmi'
        );

        let matchesProperties = methodContent.match(regexProperties);

        if (matchesProperties) {
            console.log(matchesProperties);

            matchesProperties.forEach((p) => {
                const prop = p
                    .replace('this.', '')
                    .split('=')
                    .map((x) => x.trim());
                let type = this.properties[prop[0]];
                let attr = prop[0];
                let name = prop[1];

                if (!type) {
                    type = this.properties['_' + prop[0]];
                    attr = '_' + attr;
                }

                templateProperties += `        const ${attr}Expected: ${type} = ${this.generateParamValue(
                    {
                        type: type,
                        name: name,
                    }
                )};
`;

                if (['boolean', 'number'].includes(type)) {
                    templateOutcomesProperties += `        expect(component['${attr}']).toBe(${attr}Expected);
`;
                } else {
                    templateOutcomesProperties += `        expect(component['${attr}']).toStrictEqual(${attr}Expected);
`;
                }
            });
        }

        return {
            templateProperties,
            templateOutcomesProperties,
        };
    },

    /**
     * @name generateTemplateSpyMethods
     * @description generete template for spy
     * @return {void}
     */
    generateTemplateSpyMethods: function (
        methodContent,
        otherMethods,
        methodName
    ) {
        let templateSpyMethods = ``;
        let templateOutcomesSpyMethods = ``;
        let templateParams = ``;

        let keys = Object.keys(this.methods).filter((m) => m != methodName);

        // spy
        const spys = keys.filter((m) => methodContent.includes(m));

        spys.forEach(
            (m) =>
                (templateSpyMethods += `        spyOn(component as any, '${m}');
`)
        );

        // outcomes component
        spys.forEach((m) => {
            let method = m;
            const regex = new RegExp(`(${method})\\s*\\.*(\\w+)*\\(`, 'g');

            let matches = regex.exec(methodContent);

            if (matches && matches.length == 3) {
                //buscamos si el metodo NO tiene parametros
                const regexParams = new RegExp(
                    `(${matches[0].replace('(', '')})\\(\\)`,
                    'g'
                );

                let matchesParams = regexParams.exec(methodContent);
                if (matchesParams) {
                    templateOutcomesSpyMethods +=
                        this.printToHaveBeenCalledTimes({
                            method: m,
                            matches,
                        });
                } else {
                    //buscamos los parametros del metodo
                    const regexParamsFound = new RegExp(
                        `(${matches[1]})\\s*\\.*(\\w+)*\\((.|\\s)[^\\)]+`,
                        'g'
                    );

                    let matchesParamsFound =
                        regexParamsFound.exec(methodContent);

                    if (matchesParamsFound) {
                        let param = matchesParamsFound[0]
                            .replace(matches[0], '')
                            .replace(/this\./gim, 'component.')
                            .trim();
                        templateParams = this.generatePropertiesMethod(param);

                        templateOutcomesSpyMethods +=
                            this.printToHaveBeenCalledWith({
                                method: m,
                                matches,
                                matchesParamsFound,
                                param: param.includes('(')
                                    ? `/*${param}*/`
                                    : param,
                            });
                    }
                }
            }
        });

        templateSpyMethods += `
        ${templateParams}`;

        return {
            templateSpyMethods,
            templateOutcomesSpyMethods,
        };
    },

    /**
     * @name generateTemplateSpyServices
     * @description [descripción de la funcion]
     * @return {void}
     */
    generateTemplateSpyServices: function (methodContent, params) {
        let templateSpyServices = ``;
        let templateOutcomesSpyServices = ``;
        let templateParams = ``;

        let spysServices = this.services.filter((s) =>
            methodContent.includes(s.name)
        );

        if (spysServices.length) {
            spysServices.forEach((s) => {
                let service = s.name;

                const regex = new RegExp(`(${service})\\s*\\.(\\w+)\\(`, 'g');

                let matches = regex.exec(methodContent);

                if (!matches) {
                    templateSpyServices += `/** Method no found **/
        spyOn(${service}, 'Insert the method name');
`;
                }

                if (matches && matches.length == 3) {
                    templateSpyServices += `        spyOn(${service}, '${matches[2]}');
`;

                    //buscamos si el servicio NO tiene parametros
                    const regexParams = new RegExp(
                        `(${matches[0].replace('(', '')})\\(\\)`,
                        'g'
                    );

                    let matchesParams = regexParams.exec(methodContent);
                    if (matchesParams) {
                        templateOutcomesSpyServices +=
                            this.printToHaveBeenCalledTimes({
                                service: s,
                                matches,
                            });
                    } else {
                        //buscamos los parametros del servicio
                        const regexParamsFound = new RegExp(
                            `(${matches[1]})\\s*\\.(\\w+)\\((.|\\s)[^\\)]+`,
                            'g'
                        );

                        let matchesParamsFound =
                            regexParamsFound.exec(methodContent);

                        if (matchesParamsFound) {
                            let param = matchesParamsFound[0]
                                .replace(matches[0], '')
                                .replace(/this\./gim, 'component.')
                                .trim();

                            templateParams =
                                this.generatePropertiesMethod(param);

                            templateOutcomesSpyServices +=
                                this.printToHaveBeenCalledWith({
                                    service: s,
                                    matches,
                                    matchesParamsFound,
                                    param: param.includes('(')
                                        ? `/*${param}*/`
                                        : param,
                                });
                        }
                    }
                }
            });
        }

        templateSpyServices += `
        ${templateParams}`;

        return {
            templateSpyServices,
            templateOutcomesSpyServices,
        };
    },

    /**
     * @name generatePropertiesMethod
     * @description [descripción de la funcion]
     * @return {void}
     */
    generatePropertiesMethod: function (param) {
        let template = '';
        let paramsArray = param.split(',').map((m) => m.trim());

        paramsArray.forEach((t) => {
            if (t.includes('component.')) {
                let propertyName = t.replace('component.', '');

                let aux = propertyName.split('.');
                propertyName = aux.shift();

                let propertiesTemplate = '';

                if (!propertyName.includes(':')) {
                    propertiesTemplate += `component['${propertyName}'] = ${this.generateParamValue(
                        {
                            name: propertyName,
                            type: this.properties[propertyName],
                        }
                    )}
            
`;
                }
                if (!template.includes(propertiesTemplate)) {
                    template += propertiesTemplate;
                }
            }
        });

        return template;
    },

    /**
     * @name generateTemplateSpyEmits
     * @description search emits add spy
     * @return {void}
     */
    generateTemplateSpyEmits: function (methodContent) {
        let templateSpyEmits = ``;
        let templateOutcomesSpyEmits = ``;
        let templateParams = ``;

        // buscamos los emit
        const regexEmit = new RegExp(
            `this\\s*\\.\\s*(\\w+)\\s*\\.?emit\\(`,
            'gmi'
        );

        let matchesEmit = methodContent.match(regexEmit);

        if (matchesEmit) {
            matchesEmit.forEach((emitter) => {
                const emitterName = emitter
                    .replace('(', '')
                    .replace('.emit', '')
                    .replace('this.', '');

                templateSpyEmits += `        spyOn(component['${emitterName}'], 'emit');
`;

                //buscamos si el metodo NO tiene parametros
                const regexParams = new RegExp(
                    `(${emitter.replace('(', '')})\\(\\)`,
                    'g'
                );

                let matchesEmitParams = regexParams.exec(methodContent);
                if (matchesEmitParams) {
                    templateOutcomesSpyEmits += this.printToHaveBeenCalledTimes(
                        {
                            emit: emitterName,
                            matchesEmit,
                        }
                    );
                } else {
                    let regexString = `(${emitter.replace(
                        '(',
                        ''
                    )})\\((.|\\s)[^\\)]+`;

                    //buscamos los parametros del metodo
                    const regexParamsFound = new RegExp(regexString, 'g');

                    let matchesEmitParamsFound =
                        regexParamsFound.exec(methodContent);

                    if (matchesEmitParamsFound) {
                        let param = matchesEmitParamsFound[0]
                            .replace(emitter, '')
                            .replace(/this\./gim, 'component.')
                            .trim();
                        templateParams = this.generatePropertiesMethod(param);

                        templateOutcomesSpyEmits +=
                            this.printToHaveBeenCalledWith({
                                emit: emitterName,
                                param: param.includes('(')
                                    ? `/*${param}*/`
                                    : param,
                            });
                    }
                }
            });
        }

        templateSpyEmits += `
        ${templateParams}`;

        return {
            templateSpyEmits,
            templateOutcomesSpyEmits,
        };
    },

    /**
     * @name processMethods
     * @description [descripción de la funcion]
     * @return {void}
     */
    processMethods: function () {
        let keys = Object.keys(this.methods);

        let templateMethod = keys
            .map((key) => {
                const methodName = key;
                const methodContent = this.methods[key].code;
                const params = this.methods[key].parameters;
                const returnType = this.methods[key].returnType;
                const otherMethods = keys;

                return this.processMethod(
                    methodName,
                    methodContent,
                    params,
                    returnType,
                    otherMethods
                );
            })
            .join('');

        return {
            template: templateMethod,
            isTimeout: this.isTimeout,
        };
    },

    /**
     * @name printToHaveBeenCalledTimes
     * @description [descripción de la funcion]
     * @return {void}
     */
    printToHaveBeenCalledTimes: function (data) {
        let accessModifier = 'public';

        if (this.methods[data.method]) {
            accessModifier = this.methods[data.method].accessModifier;
        }

        const isPrivate = accessModifier == 'private';

        if (data.emit) {
            return `        expect(component['${data.emit}'].emit).toHaveBeenCalledTimes(1);
            `;
        } else {
            return `        expect(${
                data.method ? 'component' : data.service.name
            }${isPrivate?'':'.'}${
                data.method
                    ? isPrivate
                        ? `['${data.method}']`
                        : data.method
                    : data.matches
                    ? data.matches[2]
                    : 'SOME_METHOD'
            }).toHaveBeenCalledTimes(1);
`;
        }
    },

    /**
     * @name printToHaveBeenCalledWith
     * @description [descripción de la funcion]
     * @return {void}
     */
    printToHaveBeenCalledWith: function (data) {
        let accessModifier = 'public';

        if (this.methods[data.method]) {
            accessModifier = this.methods[data.method].accessModifier;
        }
        const isPrivate = accessModifier == 'private';

        if (data.emit) {
            return `        expect(component['${data.emit}'].emit).toHaveBeenCalledWith(${data.param});
`;
        } else {
            return `        expect(${
                data.method ? 'component' : data.service.name
            }${isPrivate?'':'.'}${
                data.method
                    ? isPrivate
                        ? `['${data.method}']`
                        : data.method
                    : data.matches
                    ? data.matches[2]
                    : 'SOME_METHOD'
            }).toHaveBeenCalledWith(${data.param});
`;
        }
    },

    /**
     * @name generateParamValue
     * @description [descripción de la funcion]
     * @return {void}
     */
    generateParamValue: function (param) {
        if (!param.type) {
            return `{} as any`;
        }
        if (param.type == 'number[]') {
            return `[${util.getRandomNumber()}, ${util.getRandomNumber()}, ${util.getRandomNumber()}, ${util.getRandomNumber()}]`;
        }

        if (param.type == 'number') {
            return util.getRandomNumber();
        }

        if (param.type == 'string[]') {
            return `['${util.addIndefiniteArticle(
                param.name
            )}-1', '${util.addIndefiniteArticle(
                param.name
            )}-2', '${util.addIndefiniteArticle(param.name)}-3']`;
        }

        if (param.type == 'string') {
            return `'${util.addIndefiniteArticle(param.name)}'`;
        }

        if (param.type == 'boolean[]') {
            return `[true, false, true]`;
        }

        if (param.type == 'boolean') {
            return `true`;
        }

        if (param.type.includes('[]')) {
            return `[] as ${param.type}`;
        }

        return `{} as ${param.type}`;
    },
};

module.exports = processUtil;
