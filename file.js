const path = require('path');
const fs = require('fs');

const file = {
    /**
     * @name validateFile
     * @description validate only ts files
     * @return {void}
     */
    validateFile: function (currentFilePath) {
        const extension = currentFilePath.substring(
            currentFilePath.indexOf('.'),
            currentFilePath.length
        );

        return extension.includes('ts');
    },

    /**
     * @name getComponentPaht
     * @description generate the component filepath
     * @return {void}
     */
    getComponentPaht: function (currentFilePath) {
        const directorySeparator = path.sep;

        return currentFilePath
            .substring(
                currentFilePath.lastIndexOf(directorySeparator),
                currentFilePath.length
            )
            .replace(directorySeparator, '')
            .replace('.ts', '');
    },

    /**
     * @name existsTestFile
     * @description [descripción de la funcion]
     * @return {void}
     */
    existsTestFile: function (currentFilePath) {
        const testFilePath = currentFilePath.replace('.ts', '.spec.ts');

        return fs.existsSync(testFilePath);
    },
};
module.exports = file;
