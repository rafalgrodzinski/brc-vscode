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
    let alreadyFoundFun = false;

    for (let i=0; i<document.lineCount; i++) {
        let line = document.lineAt(i);
        let match = null;
        let name = null;
        let detail = null;
        let symbolKind = null;
        let startIndex = 0;
        
        // function
        if (match = line.text.match("(@export\\s+)?(\\S+)\\s+fun")) {
            alreadyFoundFun = true;
            name = match[2];
            detail = "fun";
            if (match[1])
                detail += ", @export";
            symbolKind = vscode.SymbolKind.Function;
            startIndex = match[0].indexOf(name);
        //raw
        } else if (match = line.text.match("(\\S+)\\s+raw")) {
            alreadyFoundFun = true;
            name = match[1];
            detail = "raw";
            symbolKind = vscode.SymbolKind.Function;
            startIndex = match[0].indexOf(name);
        // blob
        } else if (match = line.text.match("^\\s*(\\S+)\\s+blob\\s*$")) {
            name = match[1];
            detail = "blob";
            symbolKind = vscode.SymbolKind.Struct;
            startIndex = match[0].indexOf(name);
        // module
        } else if (match = line.text.match("^\\s*@module\\s+(\\S+)")) {
            name = match[1];
            detail = "@module";
            symbolKind = vscode.SymbolKind.File;
            startIndex = match[0].indexOf(name);
        // import
        } else if (match = line.text.match("^\\s*@import\\s+(\\S+)")) {
            name = match[1];
            detail = "@import";
            symbolKind = null;
            startIndex = match[0].indexOf(name);
        // variable
        } else if (!alreadyFoundFun && (match = line.text.match("^\\s*(@export\\s+)?\\s*(\\S+)\\s+((u|s|f)\\d+|data|blob|ptr)"))) {
            name = match[2];
            detail = match[3];
            if (match[1])
                detail += ", @export";
            symbolKind = vscode.SymbolKind.Variable;
            startIndex = match[0].indexOf(name);
        }

        if (match) {
            let range = new vscode.Range(
                new vscode.Position(i, startIndex),
                new vscode.Position(i, startIndex + name.length)
            );
            let symbol = new vscode.DocumentSymbol(
                name,
                detail,
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