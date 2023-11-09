const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

const ts = require('typescript');
const file = require('./file.js');
const template = require('./template.js');

function activate(context) {
    let disposable = vscode.commands.registerCommand(
        'extension.jestGeneratorEka',
        async function () {
            // Obtener el archivo activo
            const activeTextEditor = vscode.window.activeTextEditor;

            if (activeTextEditor) {
                const currentFilePath = activeTextEditor.document.uri.fsPath;

                // validamos que la extension del archivo sea la correcta
                if (file.validateFile(currentFilePath)) {
                    const currentFileComponentPath =
                        file.getComponentPaht(currentFilePath);

                    // validamos si el archivo de pruebas existe sino lo creamos
                    if (!file.existsTestFile(currentFilePath)) {
                        vscode.window.showInformationMessage(
                            `Test file does not exist and was generated.`
                        );

                        const activeTextEditor = vscode.window.activeTextEditor;

                        if (activeTextEditor) {
                            let fileContent =
                                activeTextEditor.document.getText();

                            testContent = template.generateTemplate(
                                fileContent,
                                currentFileComponentPath
                            );
                            const testFilePath = currentFilePath.replace(
                                '.ts',
                                '.spec.ts'
                            );

                            fs.writeFileSync(testFilePath, testContent);

                            const uri = vscode.Uri.file(testFilePath);
                            try {
                                const document =
                                    await vscode.workspace.openTextDocument(
                                        uri
                                    );
                                await vscode.window.showTextDocument(document);
                            } catch (error) {
                                vscode.window.showErrorMessage(
                                    `Error al abrir el archivo: ${error.message}`
                                );
                                console.error(error); // Esto mostrará más detalles en la consola del desarrollador
                            }
                        }

                        vscode.window.showInformationMessage(
                            `Jest tests have been generated for: ${currentFilePath}`
                        );
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
