"use strict";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand(
        "expressLines.performEvaluation", () => {
        vscode.window.showInformationMessage("This should perform an evaluation!");
    });

    context.subscriptions.push(disposable);
}
