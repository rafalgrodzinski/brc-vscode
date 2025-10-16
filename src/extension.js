const vscode = require("vscode");

function activate(context) {
    console.log("BRC extension activated");

    vscode.window.showInformationMessage('Hello World!');
}

/*export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            {scheme: "file", language: "brc"},
            new BrcDocumentSymbolProvider()
        )
    );
    console.log("BRC extension active");
}*/

/*export class BrcDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

}*/

function deactivate() { }

module.exports = {
    activate,
    deactivate
}