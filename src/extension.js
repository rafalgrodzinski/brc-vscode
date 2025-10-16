const vscode = require("vscode");

function activate(context) {
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            {scheme: "file", language: "brc"},
            new BrcDocumentSymbolProvider()
        )
    );
}

// implements vscode.DocumentSymbolProvider
class BrcDocumentSymbolProvider {
    provideDocumentSymbols(document, token) {
        let symbols = getSymbols(document);
        return symbols;
    }
}

function getSymbols(document) {
    let symbols = [];

    for (let i=0; i<document.lineCount; i++) {
        let line = document.lineAt(i);
        let match = line.text.match("(\\S+)\\s+fun");

        if (match) {
            let range = new vscode.Range(
                new vscode.Position(i, match.index),
                new vscode.Position(i, match.index + match[1].length)
            );
            let symbol = new vscode.DocumentSymbol(
                match[1],
                null,
                vscode.SymbolKind.Function,
                range,
                range
            );
            symbols.push(symbol);
        }
    }

    return symbols;
}

module.exports = {
    activate
}