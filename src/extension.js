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
            } else if (sourceLine[column] == "\n") {
                column++;
            } else {
                while (tryMatchingOneOf(sourceLine, column, [" ", "\t", "/*", "*/", "\n"]) == 0 && column < sourceLine.length)
                    column++;
            }

            let sourceToken = new SourceToken(line, tokenColumn, column - tokenColumn, sourceLine.substring(tokenColumn, column));
            sourceTokens.push(sourceToken);
        }

        sourceTokens.push(new SourceToken(line, column, 1, "\n"));
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

    let singleLineDepth = 0;
    let multiLineDepth = 0;

    parentKind = null;

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
            if (singleLineDepth > 0)
                singleLineDepth--;
        } else if (!isLineComment && commentDepth == 0) {
            // fun
            if ((sourceTokens[i].lexme == "fun" || sourceTokens[i].lexme == "fun:" ) && i > 0) {
                symbolFound = true;

                symbolName = sourceTokens[i-1].lexme;
                symbolDetail = "fun";

                if (i > 1 && sourceTokens[i-2].lexme == "@export") {
                    symbolDetail += ", @export";
                    symbolColumn = sourceTokens[i-2].column;
                    symbolKind = vscode.SymbolKind.Function;
                    multiLineDepth++;
                } else if (i > 1 && sourceTokens[i-2].lexme == "@extern") {
                    symbolDetail += ", @extern";
                    symbolColumn = sourceTokens[i-2].column;
                    symbolKind = vscode.SymbolKind.Variable;
                    singleLineDepth++;
                } else {
                    symbolColumn = sourceTokens[i-1].column;
                    symbolKind = vscode.SymbolKind.Function;
                    multiLineDepth++;
                }
                
                symbolLine = sourceTokens[i].line;
                symbolLength = sourceTokens[i].column + "fun".length - symbolColumn;
            // raw
            } else if (sourceTokens[i].lexme.startsWith("raw") && i > 0) {
                symbolFound = true;

                symbolName = sourceTokens[i-1].lexme;
                symbolDetail = "raw";
                symbolKind = vscode.SymbolKind.Function;

                symbolColumn = sourceTokens[i-1].column;
                symbolLine = sourceTokens[i-1].line;
                symbolLength = sourceTokens[i].column + "raw".length - symbolColumn;  

                multiLineDepth++;
            // blob
            } else if (sourceTokens[i].lexme == "blob" && i > 0) {
                symbolFound = true;

                symbolName = sourceTokens[i-1].lexme;
                symbolDetail = "blob";
                symbolKind = vscode.SymbolKind.Struct;

                if (i > 1 && sourceTokens[i-2].lexme == "@export") {
                    symbolDetail += ", @export";
                    symbolColumn = sourceTokens[i-2].column;
                } else {
                    symbolColumn = sourceTokens[i-1].column;
                }

                symbolLine = sourceTokens[i-1].line;
                symbolLength = sourceTokens[i].column + sourceTokens[i].length - symbolColumn;                

                multiLineDepth++;
                parentKind = "blob";
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
            // construct depths
            } else if (sourceTokens[i].lexme == "if" || sourceTokens[i].lexme == "rep") {
                let currentI = i;
                isSingleLine = false;

                while (sourceTokens[currentI].lexme != "\n") {
                    if (sourceTokens[currentI].lexme.includes(":")) {
                        isSingleLine = true;
                        break;
                    }
                    currentI++;
                }

                if (isSingleLine)
                    singleLineDepth++;
                else
                    multiLineDepth++;
            // exit parent
            } else if (sourceTokens[i].lexme == ";") {
                if (multiLineDepth > 0)
                    multiLineDepth--;
                if (multiLineDepth == 0)
                    parentSymbol = null;
            // variable
            } else if ((singleLineDepth == 0 && multiLineDepth == 0) || (singleLineDepth == 0 && multiLineDepth == 1 && parentSymbol)) {
                let match = sourceTokens[i].lexme.match("^((u|s|f)\\d+|data|blob|ptr|a$)");
                if (match && i > 0) {
                    symbolFound = true;

                    symbolName = sourceTokens[i-1].lexme;
                    symbolDetail = match[0];
                    symbolKind = vscode.SymbolKind.Variable;

                    symbolLine = sourceTokens[i].line;
                    symbolColumn = sourceTokens[i-1].column;
                    symbolLength = sourceTokens[i].column + match[0].length - symbolColumn;

                    singleLineDepth++;
                }
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

                if (parentKind == "blob") {
                    parentKind = null;
                    parentSymbol = symbol;
                }
            }
        }
    }

    return symbols;
}

module.exports = {
    activate
}