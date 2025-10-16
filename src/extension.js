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
        let match = null;
        let symbolKind;
        
        // function
        if (match = line.text.match("(\\S+)\\s+fun")) {
            symbolKind = vscode.SymbolKind.Function;
        // blob
        } else if (match = line.text.match("(\\S+)\\s+blob")) {
            symbolKind = vscode.SymbolKind.Struct;
        // variable
        }/* else if (match = line.text.match("(^\\s*\\S+)\\s+((u|s|f)\\d+|data|blob|ptr)")) {
            symbolKind = vscode.SymbolKind.Variable;
        }*/

        if (match) {
            let range = new vscode.Range(
                new vscode.Position(i, match.index),
                new vscode.Position(i, match.index + match[1].length)
            );
            let symbol = new vscode.DocumentSymbol(
                match[1],
                null,
                symbolKind,
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