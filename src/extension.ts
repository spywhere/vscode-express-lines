"use strict";
import * as vscode from "vscode";

interface EvaluatorOption {
    identifier: string;
    name?: string;
    description: string;
    command: string;
    escapedCharacters?: string;
    defaultExpression?: string;
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(new ExpressLinesController());
}

class ExpressLinesController {
    private disposable: vscode.Disposable;

    constructor(){
        let subscriptions: vscode.Disposable[] = [];

        subscriptions.push(vscode.commands.registerTextEditorCommand(
            "expressLines.performDefaultEvaluation", (editor, edit) => {
                this.selectDefaultEvaluator(editor, edit);
            }
        ));

        subscriptions.push(vscode.commands.registerTextEditorCommand(
            "expressLines.performCustomEvaluation", (editor, edit) => {
                this.selectCustomEvaluator(editor, edit);
            }
        ));

        this.disposable = vscode.Disposable.from(...subscriptions);
    }

    dispose(){
        this.disposable.dispose();
    }

    selectDefaultEvaluator(editor: vscode.TextEditor,
                           edit: vscode.TextEditorEdit){
        var evaluatorIdentifier = vscode.workspace.getConfiguration(
            "expressLines"
        ).get<string>("defaultEvaluator").toLowerCase();

        var evaluatorOption: EvaluatorOption = null;
        if(["js", "javascript"].every(identifier => {
            return identifier !== evaluatorIdentifier;
        })){
            evaluatorOption = this.findEvaluatorOption(evaluatorOption => {
                return (
                    evaluatorOption.identifier.toLowerCase() ===
                    evaluatorIdentifier
                );
            });
        }
        if(evaluatorOption === undefined){
            vscode.window.showErrorMessage(
                `There is no evaluator identified with "${evaluatorIdentifier}"`
            );
            return;
        }

        this.inputExpression(editor, edit, evaluatorOption);
    }

    selectCustomEvaluator(editor: vscode.TextEditor,
                          edit: vscode.TextEditorEdit){
        var evaluators = [{
            label: "JavaScript",
            description: "Evaluate JavaScript expression with \"eval\" function"
        }];
        evaluators.push(...vscode.workspace.getConfiguration(
            "expressLines"
        ).get<EvaluatorOption[]>("evaluators").map(evaluatorOption => {
            return {
                label: evaluatorOption.name || evaluatorOption.identifier,
                description: evaluatorOption.description
            };
        }));

        vscode.window.showQuickPick(evaluators, {
            placeHolder: "Pick an evaluator you want to use..."
        }).then(item => {
            if(!item){
                return;
            }

            var evaluatorOption: EvaluatorOption = null;
            if("JavaScript" !== item.label){
                evaluatorOption = this.findEvaluatorOption(evaluatorOption => {
                    if(evaluatorOption.name){
                        return evaluatorOption.name === item.label;
                    }else{
                        return evaluatorOption.identifier === item.label;
                    }
                });
            }
            if(evaluatorOption === undefined){
                vscode.window.showErrorMessage(
                    "This shouldn't happen at all. If you see this message," +
                    " please file the developer an issue on GitHub."
                );
                return;
            }

            this.inputExpression(editor, edit, evaluatorOption);
        });
    }

    findEvaluatorOption(predicate: (value: EvaluatorOption) => boolean){
        return vscode.workspace.getConfiguration(
            "expressLines"
        ).get<EvaluatorOption[]>("evaluators").find(predicate);
    }

    inputExpression(editor: vscode.TextEditor, edit: vscode.TextEditorEdit,
                    evaluatorOption: EvaluatorOption){
        vscode.window.showInputBox({
            prompt: "Expression for " + ((evaluatorOption) ? (
                evaluatorOption.name ?
                evaluatorOption.name : evaluatorOption.identifier
            ) : "JavaScript"),
            placeHolder: "Enter the expression to evaluate",
            value: ((
                evaluatorOption && evaluatorOption.defaultExpression
            ) ? evaluatorOption.defaultExpression : "<sel>")
        }).then(value => {
            if(!value){
                return;
            }
            vscode.window.showInformationMessage(
                ExpressionParser.expandExpression(
                    editor, evaluatorOption, value
                ).join(", ")
            );
        });
    }
}

interface ExpressionDescriptor {
    lineNumber: number;
    line: string;
    selection: string;
    escapedCharacters: string;
}

class ExpressionParser {
    private static expandDescriptor(descriptor: ExpressionDescriptor,
                                    expression: string) : string{
        var pattern = new RegExp(
            "\\\\([<])|<(\\w+)(:([^:<>]*))?(:(.+))?>", "g"
        );
        return expression.replace(pattern, (
            expr, esc, key, t3, value, t5, subexpr
        ) => {
            if(esc){
                return esc;
            }else if(key === "lineno"){
                return descriptor.lineNumber.toString();
            }else if(key === "line"){
                return descriptor.line;
            }else if(key === "sel" || key === "selection"){
                return descriptor.selection;
            }else if(key === "len" || key === "length"){
                return this.expandDescriptor(
                    descriptor, subexpr || value
                ).length.toString();
            }else if(key === "lower"){
                return this.expandDescriptor(
                    descriptor, subexpr || value
                ).toLowerCase();
            }else if(key === "upper"){
                return this.expandDescriptor(
                    descriptor, subexpr || value
                ).toUpperCase();
            }else if(key === "trim"){
                return this.expandDescriptor(
                    descriptor, subexpr || value
                ).trim();
            }else if(key === "trims"){
                return this.expandDescriptor(
                    descriptor, subexpr || value
                ).split("\n").map(content => {
                    return content.trim();
                }).join("\n");
            }else if(key === "join"){
                return this.expandDescriptor(
                    descriptor, subexpr
                ).split("\n").join(value);
            }else if(key === "escaped"){
                return this.expandDescriptor(
                    descriptor, subexpr || value
                ).replace(new RegExp(
                    "([" + descriptor.escapedCharacters + "])", "g"
                ), "\\$1");
            }else{
                return expr;
            }
        });
    }

    static expandExpression(editor: vscode.TextEditor,
                            evaluatorOption: EvaluatorOption,
                            expression: string){
        var escapedCharacters = vscode.workspace.getConfiguration(
            "expressLines"
        ).get<string>("escapedCharacters");
        if(evaluatorOption && evaluatorOption.escapedCharacters){
            escapedCharacters = evaluatorOption.escapedCharacters;
        }

        return editor.selections.map(selection => {
            var descriptor = {
                lineNumber: selection.active.line,
                line: editor.document.lineAt(selection.active.line).text,
                selection: editor.document.getText(selection),
                escapedCharacters: escapedCharacters
            };
            return this.expandDescriptor(descriptor, expression);
        });
    }
}

class Evaluator {
    constructor(evaluatorOption: EvaluatorOption){

    }

    evaluate(content: string){

    }
}
