const ts = require('typescript');

const typescript = {
    /**
     * @name searchMethodsProperties
     * @description get information about the typescript class
     * @return {void}
     */
    searchMethodsProperties: function (fileContent) {
        // buscamos todos los metodos

        this.sourceCode = fileContent;

        this.sourceFile = ts.createSourceFile(
            'temp.ts',
            this.sourceCode,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TS
        );

        this.methods = {};
        this.properties = {};

        this.visitNode(this.sourceFile);

        return {
            methods: this.methods,
            properties: this.properties,
        };
    },

    /**
     * @name visitNode
     * @description for each node in the class
     * @return {void}
     */
    visitNode: function (node) {
        if (
            ts.isMethodDeclaration(node) &&
            node.name &&
            ts.isIdentifier(node.name)
        ) {
            const methodName = node.name.text;
            const methodText = this.sourceCode.substring(node.pos, node.end);

            const parameters = node.parameters.map((param) => {
                const paramName = param.name.getText();
                const paramType = param.type ? param.type.getText() : 'any';
                return {
                    name: paramName,
                    type: paramType,
                };
            });

            const returnType = node.type ? node.type.getText() : 'void';

            this.methods[methodName] = {
                code: methodText,
                parameters: parameters,
                returnType: returnType,
            };
        }

        if (ts.isClassDeclaration(node)) {
            for (const member of node.members) {
                if (ts.isPropertyDeclaration(member)) {
                    const name = member.name.getText(this.sourceFile);
                    const type = member.type
                        ? member.type.getText(this.sourceFile)
                        : 'any'; // Si no se especifica un tipo, asume 'any'
                    this.properties[name] = type;
                }
            }
        }
        ts.forEachChild(node, this.visitNode.bind(this));
    },
};
module.exports = typescript;
