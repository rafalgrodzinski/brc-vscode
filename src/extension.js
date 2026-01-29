const vscode = require("vscode");

class SourceToken {
    constructor(line, column, length, lexme) {
        this.line = line;
        this.column = column;
        this.length = length;
        this.lexme = lexme;
    }
}

// implements vscode.DocumentSymbolProvider
class BrcDocumentSymbolProvider {
    provideDocumentSymbols(document, token) {
        let sourceTokens = getSourceTokens(document);
        let symbols = getSymbols(sourceTokens);
        return symbols;
    }
}

function activate(context) {
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            {scheme: "file", language: "brc"},
            new BrcDocumentSymbolProvider()
        )
    );
}

function getSourceTokens(document) {
    let sourceTokens = [];

    for (let line=0; line<document.lineCount; line++) {
        let sourceLine = document.lineAt(line).text;
        let column = 0;

        while (column < sourceLine.length) {
            // skip white spaces
            while (sourceLine[column] == ' ' || sourceLine[column] == '\t')
                column++;

            let tokenColumn = column;

            let count = tryMatchingOneOf(sourceLine, column, ["/*", "*/", "//", "\n"]);
            if (count != 0) {
                column += count;
            } else {
                while (tryMatchingOneOf(sourceLine, column, [" ", "\t", "/*", "*/", "\n"]) == 0 && column < sourceLine.length)
                    column++; 
            }

            let sourceToken = new SourceToken(line, tokenColumn, column - tokenColumn, sourceLine.substring(tokenColumn, column));
            sourceTokens.push(sourceToken);
        }
    }

    return sourceTokens;
}

function tryMatchingOneOf(source, currentIndex, lexmes) {
    for (lexme of lexmes) {
        let matchLength = tryMatching(source, currentIndex, lexme);
        if (matchLength > 0)
            return lexme.length;
    }

    return 0;
}

function tryMatching(source, currentIndex, lexme) {
    if (source.length < currentIndex + lexme.length)
        return 0;

    for (let i=0; i<lexme.length; i++) {
        if (source[currentIndex + i] != lexme[i])
            return 0;
    }

    return lexme.length;
}

function getSymbols(sourceTokens) {
    let symbols = [];

    let commentDepth = 0;
    let isLineComment = false;
    let parentSymbol = null;

    for (let i=0; i<sourceTokens.length; i++) {
        let symbolFound = false;

        let symbolName;
        let symbolDetail;
        let symbolKind;

        let symbolLine;
        let symbolColumn;
        let symbolLength;

        if (sourceTokens[i].lexme == "/*") {
            commentDepth++;
        } else if (sourceTokens[i].lexme == "*/") {
            commentDepth--;
        } else if (sourceTokens[i].lexme == "//") {
            isLineComment = true;
        } else if (sourceTokens[i].lexme == "\n") {
            isLineComment = false;
        } else if (!isLineComment && commentDepth == 0) {
            // fun
            if ((sourceTokens[i].lexme == "fun" || sourceTokens[i].lexme == "fun:" ) && i > 0) {
                symbolFound = true;

                symbolName = sourceTokens[i-1].lexme;
                symbolDetail = "fun";
                symbolKind = vscode.SymbolKind.Function;

                if (i > 1 && sourceTokens[i-2].lexme == "@export") {
                    symbolDetail += ", @export";
                    symbolColumn = sourceTokens[i-2].column;
                } else {
                    symbolColumn = sourceTokens[i-1].column;
                }
                
                symbolLine = sourceTokens[i].line;
                symbolLength = sourceTokens[i].column + sourceTokens[i].length - symbolColumn;
            // raw
            } else if (sourceTokens[i].lexme == "raw" && i > 0) {

            // blob
            } else if (sourceTokens[i].lexme == "blob" && i > 0) {
                symbolFound = true;

                symbolName = sourceTokens[i-1].lexme;
                symbolDetail = "blob";
                symbolKind = vscode.SymbolKind.Struct;

                symbolLine = sourceTokens[i-1].line;
                symbolColumn = sourceTokens[i-1].column;
                symbolLength = sourceTokens[i].column + sourceTokens[i].length - symbolColumn;
            // module
            } else if (sourceTokens[i].lexme == "@module" && i < sourceTokens.length - 1) {
                symbolFound = true;

                symbolName = sourceTokens[i+1].lexme;
                symbolDetail = "@module";
                symbolKind = vscode.SymbolKind.File;

                symbolLine = sourceTokens[i].line;
                symbolColumn = sourceTokens[i].column;
                symbolLength = sourceTokens[i+1].column + sourceTokens[i+1].length - symbolColumn;
            // import
            } else if (sourceTokens[i].lexme == "@import" && i < sourceTokens.length - 1) {
                symbolFound = true;

                symbolName = sourceTokens[i+1].lexme;
                symbolDetail = "@import";
                symbolKind = null;

                symbolLine = sourceTokens[i].line;
                symbolColumn = sourceTokens[i].column;
                symbolLength = sourceTokens[i+1].column + sourceTokens[i+1].length - symbolColumn;
            }

            if (symbolFound) {
                let range = new vscode.Range(
                    new vscode.Position(symbolLine, symbolColumn),
                    new vscode.Position(symbolLine, symbolColumn + symbolLength)
                );
                let symbol = new vscode.DocumentSymbol(
                    symbolName,
                    symbolDetail,
                    symbolKind,
                    range,
                    range
                );

                if (parentSymbol) {
                    parentSymbol.children.push(symbol);
                } else {
                    symbols.push(symbol);
                }
            }
        }
    }

    return symbols;
}

/*function getSymbols(document) {
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
}*/

module.exports = {
    activate
}