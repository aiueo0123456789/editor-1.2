import { app } from "../../../app/app";
import { TextEditor_textSplice, TextEditor_textRemove } from "../../../commands/textEditor/textEditorCommand";

export class CodeEditorTag {
    constructor(t, this_, ) {
        const builtInFunction = [{name: "noise", return: "f32"}, {name: "arrayLength", return: "u32"}, {name: "vec2f", return: "f32"}, {name: "vec3f", return: "f32"}, {name: "vec4f", return: "f32"}, {name: "fract", return: "f32"}, {name: "floor", return: "f32"}, {name: "mix", return: "f32"}, {name: "abs", return: "f32"}, {name: "dot", return: "f32"}];
        const sourceCode = this_.getParameter(searchTarget, child.source, 1);
        /** @type {HTMLElement} */
        this.container = createTag(t, "div");
        setStyle(this.container, "width: 100%; height: 100%; display: grid; gridTemplateColumns: auto 1fr; overflow: hidden; backgroundColor: rgb(41, 41, 41); fontSize: 100%;");
        /** @type {HTMLElement} */
        this.utilBar = createTag(this.container, "div");
        setStyle(this.utilBar, "width: 100px; height: 100%; backgroundColor: rgb(50,50,50);");
        /** @type {HTMLElement} */
        let functionsGroupContainer = createTag(this.utilBar, "div");
        let functionsGroupTitle = createTag(functionsGroupContainer, "div", {textContent: "values"});
        let functionsGroup = createTag(functionsGroupContainer, "div");
        setStyle(functionsGroup, "width: 100px; height: fit-content; padding-left: 10px;");
        /** @type {HTMLElement} */
        let valuesGroupContainer = createTag(this.utilBar, "div");
        let valuesGroupTitle = createTag(valuesGroupContainer, "div", {textContent: "values"});
        let valuesGroup = createTag(valuesGroupContainer, "div");
        setStyle(valuesGroup, "width: 100px; height: fit-content; padding-left: 10px;");
        /** @type {HTMLElement} */
        let codeContainer = createTag(this.container, "div");
        setStyle(codeContainer, "width: 100%; height: 100%; display: grid; gridTemplateColumns: auto 1fr; fontFamily: monospace; overflowX: hidden; overflowY: auto;");
        /** @type {HTMLElement} */
        let lineNumbers = createTag(codeContainer, "div");
        setStyle(lineNumbers, "width: fit-content; height: 100%; textAlign: right; padding: 0px 2px; userSelect: none; color: gray; border: solid rgba(0, 0, 0, 0) 1px;");
        // createTag(codeContainer, "div"); // dummy
        /** @type {HTMLElement} */
        // let element = createTag(container, "textarea");
        /** @type {HTMLElement} */
        let codeAreaContainer = createTag(codeContainer, "div");
        setStyle(codeAreaContainer, "width: fit-content; height: 100%; position: relative; userSelect: none;");
        let codeArea = createTag(codeAreaContainer, "div");
        setStyle(codeArea, "width: fit-content; height: 100%;");
        codeArea.setAttribute("contenteditable", "true");
        codeArea.setAttribute("spellcheck", "false");
        let lastCode = sourceCode.object[sourceCode.parameter];
        const updateCode = () => {
            // let newCode = codeAreaHidden.textContent;
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            console.log(selection)
            let changeStart = selection.anchorOffset;
            console.log(selection.anchorNode)
            console.log(selection.anchorOffset)
            let changeEnd = newCode.indexOf(lastCode.slice(changeStart));
            console.log(changeStart,selection.anchorOffset, lastCode)
            if (changeStart <= changeEnd) {
                app.operator.appendCommand(new TextEditor_textSplice(sourceCode, newCode.slice(changeStart, changeEnd), changeStart));
                app.operator.execute();
            } else {
                app.operator.appendCommand(new TextEditor_textRemove(sourceCode, changeEnd + 1, changeStart + 1));
                app.operator.execute();
            }
            lastCode = newCode;
        }
        const getScetion = () => {
            return ;
        }
        let focusOffset = 0;
        codeArea.addEventListener("keydown", (e) => {
            if (true) {
                const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
                console.log(selection)
            }
            if (e.key == "ArrowUp") {
            }
            if (e.key === "Enter") {
                e.preventDefault(); // デフォルトの改行動作を無効化
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                const range = selection.getRangeAt(0);
                // 改行用に text ノードを挿入
                const newlineNode = document.createTextNode("\n");
                range.deleteContents(); // 現在選択されている内容を削除（範囲選択時対応）
                range.insertNode(newlineNode); // \n を挿入
                console.log(selection.anchorNode)
                // 挿入後にカーソルを \n の後ろに移動
                range.setStart(selection.anchorNode, selection.anchorOffset); // newlineNode = '\n' の text node
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                updateCode();
            } else if ((e.ctrlKey || e.metaKey) && e.key === "/") {
                e.preventDefault(); // デフォルトの改行動作を無効化
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                const range = selection.getRangeAt(0);
                // 改行用に text ノードを挿入
                const newlineNode = document.createTextNode("//");
                range.deleteContents(); // 現在選択されている内容を削除（範囲選択時対応）
                range.insertNode(newlineNode); // \n を挿入
                // 挿入後にカーソルを \n の後ろに移動
                range.setStart(newlineNode, newlineNode.length); // newlineNode = '\n' の text node
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                updateCode();
            } else if (e.key === "Tab") {
                e.preventDefault(); // デフォルトの改行動作を無効化
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                const range = selection.getRangeAt(0);
                // 改行用に text ノードを挿入
                const newlineNode = document.createTextNode("    ");
                range.deleteContents(); // 現在選択されている内容を削除（範囲選択時対応）
                range.insertNode(newlineNode); // \n を挿入
                // 挿入後にカーソルを \n の後ろに移動
                range.setStart(newlineNode, newlineNode.length); // newlineNode = '\n' の text node
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                updateCode();
            }
        });
        codeArea.addEventListener("paste", (e) => {
            e.preventDefault(); // ブラウザの標準ペーストを止める
            // プレーンテキストを取得
            const text = (e.clipboardData || window.clipboardData).getData("text");
            // 現在のキャレット位置にテキストを挿入
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            // キャレットを挿入後の末尾に移動
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
            updateCode();
        });
        codeArea.addEventListener("input", updateCode);
        // if (true) {
        //     codeArea.append(document.createTextNode(sourceCode.object[sourceCode.parameter]));
        // }

        const lineNumbersUpdate = () => {
            // DOMリセット
            codeArea.replaceChildren();
            lineNumbers.replaceChildren();
            functionsGroup.replaceChildren();
            valuesGroup.replaceChildren();
            // 改行で配列化
            const codeLines = sourceCode.object[sourceCode.parameter].match(/[^\n]*\n?/g).filter(line => line !== '');
            for (let i = 0; i < codeLines.length; i ++) {
                // 行番号
                createTag(lineNumbers, "div", {textContent: i});
                // 行を生成
                const l = createTag(codeArea, "div");
                setStyle(l, "width: fit-content; height: fit-content; whiteSpace: pre; display: flex;");
            }

            const extractStructs = (code) => {
                const structRegex = /struct\s+([a-zA-Z_]\w*)\s*{[^}]*}/g;
                const structs = [];
                let match;
                while ((match = structRegex.exec(code)) !== null) {
                    structs.push({
                        name: match[1],
                    });
                }
                return structs;
            };
            const extractFunctions = (code) => {
                const fnRegex = /\bfn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?:->\s*([a-zA-Z0-9_<>,\s]+))?/g;
                const functions = [];
                let match;
                while ((match = fnRegex.exec(code)) !== null) {
                    functions.push({
                        name: match[1],
                        returnType: match[2]?.trim() ?? null,
                    });
                }
                return functions;
            };
            function extractDeclaredVariables(code) {
                const regex = /\b(?:let|var|const)\s+(?:[a-zA-Z0-9_]+\s*(?:<[^>]+>)?\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/g;
                const results = [];
                let match;
                while ((match = regex.exec(code)) !== null) {
                    results.push({
                        name: match[1]
                    });
                }
                return results;
            }
            const tokens_ = sourceCode.object[sourceCode.parameter].match(/\/\/|[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー々]+|[a-zA-Z0-9_]+|[ \t]+|\r?\n|[^\w\s]/gu) || [];
            let lineNumber = 0;
            const usingStructs = extractStructs(sourceCode.object[sourceCode.parameter]);
            const usingFunctions = extractFunctions(sourceCode.object[sourceCode.parameter]).concat(builtInFunction);
            const usingValue = extractDeclaredVariables(sourceCode.object[sourceCode.parameter]);
            let state = "";
            for (const token of tokens_) {
                let color = "rgb(255, 255, 255)";
                if (token == "\n") {
                    const l_ = createTag(codeArea.children[lineNumber], "span", {textContent: token});
                    lineNumber ++;
                    state = "";
                    continue ;
                } else if (token == "//" || state == "commentout") {
                    state = "commentout";
                    color = "rgb(0, 108, 25)";
                } else if (token == " ") {
                } else if (token == "@" || state == "@") {
                    color = "rgb(116, 158, 54)";
                    if (token == "@") {
                        state = "@";
                    } else {
                        state = "";
                    }
                } else if (usingFunctions.filter(fn => fn.name == token).length > 0) { // 関数
                    color = "rgb(255, 217, 0)";
                } else if (usingStructs.filter(struct => struct.name == token).length > 0) {
                    color = "rgb(38, 212, 90)";
                } else if (isNumber(token)) { // 数字
                    color = "rgb(181, 255, 216)";
                } else if (token == "array" || token == "vec2" || token == "vec3" || token == "mat3x3" || token == "f32" || token == "u32" || token == "fn" || token == "struct" || token == "const" || token == "var" || token == "let") { // 特定の単語
                    color = "rgb(63, 78, 190)";
                } else if (token == "uniform" || token == "storage" || token == "read_write" || token == "read" || token == "return" || token == "if") { // 特定の単語
                    color = "rgb(208, 65, 165)";
                } else if (usingValue.filter(value => value.name == token).length > 0) { // 変数
                    color = "rgb(103, 154, 220)";
                } else {
                    const l_ = document.createTextNode(token)
                    codeArea.children[lineNumber].append(l_);
                    continue ;
                }
                const l_ = createTag(codeArea.children[lineNumber], "span", {textContent: token});
                setStyle(l_, `color: ${color}; whiteSpace: pre;`);
            }
            for (const fn of usingFunctions) {
                const l = createTag(functionsGroup, "div", {textContent: fn.name});
                setStyle(l, "width: fit-content; height: fit-content; whiteSpace: pre;");
            }
            for (const fn of usingValue) {
                const l = createTag(valuesGroup, "div", {textContent: fn.name});
                setStyle(l, "width: fit-content; height: fit-content; whiteSpace: pre;");
            }
        };
        lineNumbersUpdate();
        managerForDOMs.set({o: sourceCode.object, i: sourceCode.parameter, g: this_.groupID}, null, lineNumbersUpdate);
        // element.addEventListener("scroll", () => {
        //     lineNumbers.scrollTop = element.scrollTop;
        // })
        return codeArea;
    }
}