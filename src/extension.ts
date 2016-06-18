"use strict";
import * as vscode from "vscode";
import {spawnSync} from "child_process";
var process = require("process");
var request = require("request");
var querystring = require("querystring");

interface EvaluatorOption {
    identifier: string;
    name?: string;
    description: string;
    command: string[];
    escapedCharacters?: any;
    defaultExpression?: string;
}

interface EvaluatorOutput {
    error: boolean;
    value?: string;
    selection?: vscode.Selection;
    errorName?: string;
    errorMessage?: string;
}

interface Expression {
    value: string;
    selection: vscode.Selection;
}

interface ExpressionDescriptor {
    index: number;
    lineNumber: number;
    line: string;
    selection: string;
    escapedCharacters: any;
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
                this.selectDefaultEvaluator(editor);
            }
        ));

        subscriptions.push(vscode.commands.registerTextEditorCommand(
            "expressLines.performCustomEvaluation", (editor, edit) => {
                this.selectCustomEvaluator(editor);
            }
        ));

        if(vscode.workspace.getConfiguration(
            "expressLines"
        ).get<boolean>("sendUsagesAndStats")){
            this.sendUsagesAndStats();
        }

        this.disposable = vscode.Disposable.from(...subscriptions);
    }

    dispose(){
        this.disposable.dispose();
    }

    sendUsagesAndStats(){
        // Want to see this data?
        //   There! http://stats.digitalparticle.com/
        console.log("[Express-Lines] Sending usage statistics...");
        var data = querystring.stringify({
            "name": "express-lines",
            "schema": "0.1",
            "version": vscode.extensions.getExtension(
                "spywhere.express-lines"
            ).packageJSON["version"],
            "vscode_version": vscode.version,
            "platform": process.platform,
            "architecture": process.arch
        });

        request(
            "http://api.digitalparticle.com/1/stats?" + data,
            (error, response, data) => {
                if(error){
                    console.log(
                        "[Express-Lines] Error while sending usage" +
                        " statistics: " + error
                    );
                }else if(response.statusCode != 200){
                    console.log(
                        "[Express-Lines] Error while sending usage" +
                        " statistics: ErrorCode " + response.statusCode
                    );
                }else if(data.toLowerCase() !== "finished"){
                    console.log(
                        "[Express-Lines] Error while sending usage" +
                        " statistics: " + data
                    );
                }else{
                    console.log(
                        "[Express-Lines] Usage statistics has successfully sent"
                    );
                }
            }
        );
    }

    selectDefaultEvaluator(editor: vscode.TextEditor){
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
                `[Express-Lines] There is no evaluator identified with "${
                    evaluatorIdentifier
                }"`
            );
            return;
        }

        this.inputExpression(editor, evaluatorOption);
    }

    selectCustomEvaluator(editor: vscode.TextEditor){
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
                    "[Express-Lines] This shouldn't happen at all." +
                    " If you see this message, please file the developer" +
                    " an issue on GitHub."
                );
                return;
            }

            this.inputExpression(editor, evaluatorOption);
        });
    }

    findEvaluatorOption(predicate: (value: EvaluatorOption) => boolean){
        return vscode.workspace.getConfiguration(
            "expressLines"
        ).get<EvaluatorOption[]>("evaluators").find(predicate);
    }

    inputExpression(editor: vscode.TextEditor,
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
            this.evaluateExpression(editor, evaluatorOption, value);
        });
    }

    evaluateExpression(editor: vscode.TextEditor,
                       evaluatorOption: EvaluatorOption, expression: string){
        var expressions = ExpressionParser.expandExpression(
            editor, evaluatorOption, expression
        );
        if(evaluatorOption){
            var evaluator = new Evaluator(evaluatorOption);
            evaluator.evaluate(expressions, outputs => {
                this.applyExpression(editor, outputs);
            });
        }else{
            var outputs: EvaluatorOutput[] = expressions.map(expression => {
                try {
                    return {
                        error: false,
                        value: JSON.stringify(eval(expression.value)),
                        selection: expression.selection
                    };
                } catch (error) {
                    return {
                        error: true,
                        errorName: error.name,
                        errorMessage: error.message
                    };
                }
            });
            this.applyExpression(editor, outputs);
        }
    }

    applyExpression(editor: vscode.TextEditor, outputs: EvaluatorOutput[]){
        var errorOutputIndex = outputs.findIndex(output => {
            return output.error;
        });
        if(
            errorOutputIndex >= 0 && !vscode.workspace.getConfiguration(
                "expressLines"
            ).get<boolean>("ignoreError")
        ){
            var errorOutput = outputs[errorOutputIndex];
            vscode.window.showErrorMessage(
                `[Express-Lines] ${
                    errorOutput.errorName
                } on selection#${
                    errorOutputIndex
                }: ${
                    errorOutput.errorMessage
                }`
            );
            return;
        }else if(editor.selections.length !== outputs.length){
            vscode.window.showErrorMessage(
                "[Express-Lines] You have changed the selections," +
                " expressions cannot be evaluated in time."
            );
            return;
        }

        editor.edit(edit => {
            outputs.forEach(output => {
                if(output.value === null || output.error){
                    return;
                }
                if(output.selection.isEmpty){
                    edit.insert(output.selection.active, output.value);
                }else{
                    edit.replace(output.selection, output.value);
                }
            });
        });
    }
}

class ExpressionParser {
    private static expandDescriptor(descriptor: ExpressionDescriptor,
                                    expression: string) : string {
        var pattern = new RegExp(
            "\\\\([<])|<(\\w+)(:([^:<>]*))?(:(.+))?>", "g"
        );
        return expression.replace(pattern, (
            expr, esc, key, t3, value, t5, subexpr
        ) => {
            if(esc){
                return esc;
            }else if(key === "index"){
                return descriptor.index.toString();
            }else if(key === "lineno"){
                return descriptor.lineNumber.toString();
            }else if(key === "line"){
                return descriptor.line;
            }else if(key === "sel" || key === "selection"){
                return descriptor.selection.replace(/\\r\\n/g, "\n");
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
                var output = this.expandDescriptor(
                    descriptor, subexpr || value
                )
                for (var char in descriptor.escapedCharacters) {
                    if (descriptor.escapedCharacters.hasOwnProperty(char)) {
                        var replacement = descriptor.escapedCharacters[char];
                        output = output.split(char).join(replacement);
                    }
                }
                return output;
            }else{
                return expr;
            }
        });
    }

    static expandExpression(editor: vscode.TextEditor,
                            evaluatorOption: EvaluatorOption,
                            expression: string): Expression[] {
        var escapedCharacters = vscode.workspace.getConfiguration(
            "expressLines"
        ).get<any>("escapedCharacters");
        if(evaluatorOption && evaluatorOption.escapedCharacters){
            escapedCharacters = evaluatorOption.escapedCharacters;
        }

        return editor.selections.map((selection, index) => {
            var descriptor: ExpressionDescriptor = {
                index: index,
                lineNumber: selection.active.line,
                line: editor.document.lineAt(selection.active.line).text,
                selection: editor.document.getText(selection),
                escapedCharacters: escapedCharacters
            };
            return {
                value: this.expandDescriptor(descriptor, expression),
                selection: selection
            };
        });
    }
}

class Evaluator {
    private evaluatorOption: EvaluatorOption;

    constructor(evaluatorOption: EvaluatorOption){
        this.evaluatorOption = evaluatorOption;
    }

    evaluate(expressions: Expression[],
             callback: (outputs: EvaluatorOutput[]) => void){
        var outputs: EvaluatorOutput[] = expressions.map(expression => {
            var commands = this.evaluatorOption.command.slice();
            var command = commands.shift();
            var processOutput = spawnSync(
                command, commands.map(arg => {
                    return arg === "<expression>" ? expression.value : arg;
                }), {
                    timeout: vscode.workspace.getConfiguration(
                        "expressLines"
                    ).get<number>("evaluatorTimeout"),
                    encoding: vscode.workspace.getConfiguration(
                        "expressLines"
                    ).get<string>("evaluatorEncoding")
                }
            );
            return {
                error: !!processOutput.stderr || !!processOutput.error,
                value: (
                    processOutput.stdout
                ) ? processOutput.stdout.toString() : null,
                selection: expression.selection,
                errorName: (
                    processOutput.error ? processOutput.error.name : (
                        processOutput.stderr ? "Error" : ""
                    )
                ),
                errorMessage: (
                    processOutput.error ? processOutput.error.message : (
                        processOutput.stderr ?
                        processOutput.stderr.toString().split("\n").join(" ") :
                        ""
                    )
                )
            };
        });
        callback(outputs);
    }
}
