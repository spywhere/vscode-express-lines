"use strict";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        "expressLines.performDefaultEvaluation", () => {
        vscode.window.showInformationMessage("This should perform an evaluation using default evaluator!");
    }));

    context.subscriptions.push(vscode.commands.registerCommand(
        "expressLines.performCustomEvaluation", () => {
        vscode.window.showQuickPick(["Alex", "Bob", "Carl"], {
            placeHolder: "Pick an evaluator you want to use...",
            onDidSelectItem: (item)=>{
                vscode.window.showInformationMessage("You just select " + item);
            }
        });
    }));
}

/*

Expression:

<lineno> Line number
<line> Line content
<sel>, <selection> Selection content
<len:<expr>>, <length:<expr>> Length of the expression
<lower:<expr>> Make the expression lower case
<upper:<expr>> Make the expression upper case
<escaped:<expr>> Escape characters in the expression

expressLines:
  defaultEvaluator: js
  escapedCharacters: "\
  evaluators:
    python:
      name: Python
      description: Evaluate Python expression
      command: python -c <expression>
      escapedCharacters: "\
    ruby:
      name: Ruby
      description: Evaluate Ruby expression
      command: ruby -e <expression>
    java:
      name: Java
      description: Evaluate Java expression using "jrunscript"
      command: jrunscript -e <expression>



*/
