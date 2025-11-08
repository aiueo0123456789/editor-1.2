import { app } from "../../../../main.js";
import { TextEditor_textSplice } from "../../../commands/textEditor/textEditorCommand.js";
import { isNumber } from "../../utility.js";
import { tagCreater } from "../creatorForUI.js";
import { CustomTag } from "../customTag.js";
import { AutoGrid, createGrid } from "../grid.js";
import { createIcon, createTag, managerForDOMs, removeHTMLElementInObject, setClass, setLabel, setStyle } from "../util.js";

function createGroup(t, name) {
    const container = createTag(t, "div");
    const head = createTag(container, "div");
    setStyle(head, "width: 100px; height: 10px; display: flex;");

    const label = createTag(head, "label");
    // const span = document.createElement("span");
    const checkbox = createTag(label, "input", {type: "checkbox", checked: true});
    checkbox.style.display = "none";
    const span = createTag(label, "span", {class: "arrow"});

    checkbox.addEventListener("input", () => {
        inner.classList.toggle("hidden");
    })

    const title = createTag(head, "div");
    title.textContent = name;
    const inner = createTag(container, "div");
    setStyle(inner, "width: 100px; height: fit-content; padding-left: 20px;");
    return inner;
}

function createUtil(t, name) {
    const container = createTag(t, "div");
    setStyle(container, "width: 100%; height: 100%; overflowY: hidden; display: grid; gridTemplateRows: auto 1fr;");
    const title = createTag(container, "div");
    // title.textContent = name;
    const innerContainer = createTag(container, "div");
    setStyle(innerContainer, "width: 100%; height: 100%;");
    const filter = createTag(null, "input");
    setLabel(innerContainer, "filter", filter);
    const inner = createTag(innerContainer, "div");
    setStyle(inner, "width: 100%; height: 100%; overflowY: auto;");
    return inner;
}

export class CodeEditorTag extends CustomTag {
    constructor (creatorForUI,t,parent,searchTarget,child,flag) {
        super();
        const builtInFunction = [{name: "noise", return: "f32"}, {name: "arrayLength", return: "u32"}, {name: "vec2f", return: "f32"}, {name: "vec3f", return: "f32"}, {name: "vec4f", return: "f32"}, {name: "fract", return: "f32"}, {name: "floor", return: "f32"}, {name: "mix", return: "f32"}, {name: "abs", return: "f32"}, {name: "dot", return: "f32"}];
        this.sourceCode = creatorForUI.getParameter(searchTarget, child.source, 1);
        /** @type {HTMLElement} */
        this.container = createGrid(t, "c");
        // setStyle(this.container, "width: 100%; height: 100%; display: grid; gridTemplateColumns: auto 1fr; overflow: hidden; backgroundColor: rgb(52, 52, 52); fontSize: 100%;");
        /** @type {HTMLElement} */
        this.utilBar = createUtil(this.container.child1, "util");
        /** @type {HTMLElement} */
        this.functionsGroup = createGroup(this.utilBar, "funcitions");
        /** @type {HTMLElement} */
        this.valuesGroup = createGroup(this.utilBar, "values");
        /** @type {HTMLElement} */
        const rightContainerGrid = new AutoGrid("codeTagRightContainer" + creatorForUI.groupID, this.container.child2, "r", "1fr");
        // setStyle(this.rightContainer, "width: 100%; height: 100%; overflow: hidden;");
        /** @type {HTMLElement} */
        this.mainContainer = createTag(rightContainerGrid.child1, "div");
        setStyle(this.mainContainer, "width: 100%; height: 100%; display: grid; gridTemplateColumns: auto 1fr; fontFamily: monospace; overflowX: hidden; overflowY: auto;");
        /** @type {HTMLElement} */
        this.lineNumbers = createTag(this.mainContainer, "div");
        setStyle(this.lineNumbers, "width: fit-content; height: fit-content; textAlign: right; padding: 0px 2px; userSelect: none; backgroundColor: var(--sub3Color); border: solid rgba(0, 0, 0, 0) 1px;");
        /** @type {HTMLElement} */
        this.codeAreaContainer = createTag(this.mainContainer, "div");
        setClass(this.codeAreaContainer, "codeAreaContainer")
        const input = createTag(this.codeAreaContainer, "div");
        input.append(document.createTextNode(""));
        input.setAttribute("contenteditable", "true");
        // setStyle(input, "display: none;");
        setStyle(input, "width: 100px; height: 20px; position: absolute;");
        this.autocompleteArea = createTag(this.codeAreaContainer, "div");
        setStyle(this.autocompleteArea, "width: 400px; height: fit-content; maxHeight: 200px; position: absolute; display: none; backgroundColor: var(--sub3Color); border: solid rgb(90, 90, 90) 1px; overflowY: auto;");
        this.selectionArea = createTag(this.codeAreaContainer, "div");
        setStyle(this.selectionArea, "width: 0px; height: 0px; position: absolute;");
        this.caret = createTag(this.codeAreaContainer, "div");
        setClass(this.caret, "caret");
        this.textViewArea = createTag(this.codeAreaContainer, "div");
        setStyle(this.textViewArea, "width: fit-content; height: fit-content; backgroundColor: var(--sub3Color);");
        this.textViewArea.setAttribute("contenteditable", "true");
        this.textViewArea.setAttribute("spellcheck", "false");

        this.debuglogAreaContainer = createTag(rightContainerGrid.child2, "div");
        setStyle(this.debuglogAreaContainer, "width: 100%; height: 100%; backgroundColor: var(--sub3Color); borderRadius: 0px; userSelect: text; overflow: auto; whiteSpace: pre;");

        let lastScrollX = 0;
        let lastScrollY = 0;
        let isRestoringScroll = false;

        const getStringsOffsetFromLineOffset = (lineNumber) => {
            let sum = 0;
            const codeLines = this.sourceCode.object[this.sourceCode.parameter].match(/[^\n]*\n?/g).filter(line => line !== '');
            for (let i = 0; i < lineNumber; i ++) {
                sum += codeLines[i].length;
            }
            return sum;
        }
        const getSelectionOffset = (textNode, offset) => {
            let sumStringsCount = 0;
            const parentElem = textNode.parentElement;
            for (const span of parentElem.parentElement.children) {
                if (span == parentElem) {
                    return [[...this.textViewArea.children].indexOf(parentElem.parentElement),sumStringsCount + offset];
                }
                sumStringsCount += span.textContent.length;
            }
        }
        let anchorLineOffset = 0;
        let anchorOffsetInLine = 0;
        let focusLineOffset = 0;
        let focusOffsetInLine = 0;
        const getStartAndEndOffset = () => {
            const anchorOffset = getStringsOffsetFromLineOffset(anchorLineOffset) + anchorOffsetInLine;
            const focusOffset = getStringsOffsetFromLineOffset(focusLineOffset) + focusOffsetInLine;
            return [Math.min(anchorOffset, focusOffset),Math.max(anchorOffset, focusOffset)];
        }
        // コードの行数
        const getCodeLinesNum = () => {
            return (this.sourceCode.object[this.sourceCode.parameter].match(/\n/g) || []).length + 1;
        }
        // 選択中の行の文字数
        const getStringsNumFromLineOffset = (lineOffset) => {
            const codeLines = this.sourceCode.object[this.sourceCode.parameter].match(/[^\n]*\n?/g).filter(line => line !== '');
            return codeLines[lineOffset].length;
        }
        // タグとタグ内のオフセットからselectionOffset
        const getOffsetInLineTextAndOffset = (div, offset) => {
            let sumStringsCount = 0;
            for (const span of div.children) {
                if (span.textContent !== "\n") {
                    const textLen = span.textContent.length;
                    if (offset < sumStringsCount + textLen) {
                        return [span.childNodes[0], offset - sumStringsCount];
                    }
                    sumStringsCount += textLen;
                }
            }
            let lastChild = div.lastChild;
            if (div.lastChild.textContent === "\n" && div.children.length > 1) {
                lastChild = div.children[div.children.length - 2];
            }
            return [lastChild.childNodes[0], lastChild.textContent.length];
        }
        // タグとタグ内のオフセットからselectionOffset
        const getSelectionDataFromSpan = (span, offset) => {
            let offsetInLine = 0;
            const div = span.parentElement;
            const lineOffset = [...div.parentElement.children].indexOf(div);
            for (const child of div.children) {
                if (span === child) {
                    return [lineOffset, offsetInLine + offset];
                }
                offsetInLine += child.textContent.length;
            }
            return [lineOffset, 0];
        }
        const getPositionFromOffsets = (lineOffset, offsetInLine) => {
            const range = document.createRange();
            const result = getOffsetInLineTextAndOffset(this.textViewArea.children[lineOffset], offsetInLine);
            range.setStart(...result);   // 5文字目の直後
            range.setEnd(...result);
            const editorRect = this.textViewArea.getBoundingClientRect();
            if (result[0].wholeText == "\n") {
                const rect = result[0].parentElement.parentElement.getBoundingClientRect(); // その位置の矩形
                return [rect.left - editorRect.left, rect.top - editorRect.top];
            } else {
                const rect = range.getBoundingClientRect(); // その位置の矩形
                return [rect.left - editorRect.left, rect.top - editorRect.top];
            }
        }
        const selectionViewUpdate = () => {
            this.selectionArea.replaceChildren();
            if (anchorLineOffset == focusLineOffset && anchorOffsetInLine == focusOffsetInLine) {
                return ;
            }
            let min = [anchorLineOffset, anchorOffsetInLine];
            if (focusLineOffset < min[0]) {
                min = [focusLineOffset, focusOffsetInLine];
            }
            let max = [focusLineOffset, focusOffsetInLine];
            if (max[0] < anchorLineOffset) {
                max = [anchorLineOffset, anchorOffsetInLine];
            }
            if (min[0] == max[0]) {
                if (max[1] < min[1]) {
                    let keep = max[1];
                    max[1] = min[1];
                    min[1] = keep;
                }
                const div = createTag(this.selectionArea, "div", {class: "selection"});
                let left, top, width;
                [left,top] = getPositionFromOffsets(...min);
                width = getPositionFromOffsets(...max)[0] - left;
                div.style.top = `${top}px`;
                div.style.left = `${left}px`;
                div.style.width = `${width}px`;
            } else {
                for (let lineOffset = min[0]; lineOffset <= max[0]; lineOffset ++) {
                    const div = createTag(this.selectionArea, "div", {class: "selection"});
                    let left, top, width;
                    if (lineOffset == min[0]) {
                        [left,top] = getPositionFromOffsets(...min);
                        width = getPositionFromOffsets(min[0], getStringsNumFromLineOffset(min[0]))[0] - left;
                    } else if (lineOffset == max[0]) {
                        [width,top] = getPositionFromOffsets(...max);
                        left = 0;
                    } else {
                        [left,top] = getPositionFromOffsets(lineOffset, 0);
                        width = getPositionFromOffsets(lineOffset, getStringsNumFromLineOffset(lineOffset))[0] - left;
                    }
                    div.style.top = `${top}px`;
                    div.style.left = `${left}px`;
                    div.style.width = `${width}px`;
                }
            }
        }
        // window.getSelectionをselectionで更新
        // const setSection = () => {
        //     suppressSelectionChange = true;
        //     const selection = window.getSelection();
        //     const range = document.createRange();
        //     range.setStart(...getOffsetInLineTextAndOffset(textViewArea.children[anchorLineOffset], anchorOffsetInLine)); // 開始位置
        //     range.setEnd(...getOffsetInLineTextAndOffset(textViewArea.children[focusLineOffset], focusOffsetInLine)); // 終了位置
        //     selection.removeAllRanges(); // 既存の選択をクリア
        //     selection.addRange(range);   // 新しい選択を追加
        //     textViewArea.focus(); // 重要
        // }
        const setCaretPosition = () => {
            const [left, top] = getPositionFromOffsets(focusLineOffset, focusOffsetInLine).map(x => Math.max(0, x));
            this.caret.style.left = `${left}px`;
            this.caret.style.top = `${top}px`;
        }
        const getStringsFromOffset = (offset1, offset2) => {
            return this.sourceCode.object[this.sourceCode.parameter].slice(offset1, offset2);
        }
        let suppressSelectionChange = false;
        // selectionをwindow.getSelectionで更新
        document.addEventListener("selectionchange", (e) => {
            if (suppressSelectionChange) {
                suppressSelectionChange = false;
                return ;
            }
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const { startContainer, endContainer } = range;
            // target の中で選択された場合のみ処理する
            if (this.textViewArea.contains(startContainer) && this.textViewArea.contains(endContainer)) {
                [anchorLineOffset, anchorOffsetInLine] = getSelectionOffset(selection.anchorNode, selection.anchorOffset);
                [focusLineOffset, focusOffsetInLine] = getSelectionOffset(selection.focusNode, selection.focusOffset);
                setCaretPosition();
                selectionViewUpdate();
            }
        })
        this.textViewArea.addEventListener("keydown", (e) => {
            const cmdBool = (e.ctrlKey || e.metaKey);
            if (e.key == "ArrowUp") {
                e.preventDefault(); // デフォルトの改行動作を無効化
                if (cmdBool) {
                    anchorLineOffset = 0;
                    this.mainContainer.scrollTop = 0;
                } else if (1 <= anchorLineOffset) {
                    anchorLineOffset --;
                }
            }
            if (e.key == "ArrowDown") {
                e.preventDefault(); // デフォルトの改行動作を無効化
                if (cmdBool) {
                    anchorLineOffset = getCodeLinesNum();
                    this.mainContainer.scrollTop = this.mainContainer.scrollHeight;
                } else if (anchorLineOffset < getCodeLinesNum()) {
                    anchorLineOffset ++;
                }
            }
            if (e.key == "ArrowRight") {
                e.preventDefault(); // デフォルトの改行動作を無効化
                if (cmdBool) {
                    anchorOffsetInLine = getStringsNumFromLineOffset(anchorLineOffset) - 1;
                } else if (anchorOffsetInLine < getStringsNumFromLineOffset(anchorLineOffset) - 1) {
                    anchorOffsetInLine ++;
                } else {
                    anchorLineOffset ++;
                    anchorOffsetInLine = 0;
                }
            }
            if (e.key == "ArrowLeft") {
                e.preventDefault(); // デフォルトの改行動作を無効化
                if (cmdBool) {
                    anchorOffsetInLine = 0;
                } else if (1 <= anchorOffsetInLine) {
                    anchorOffsetInLine --;
                } else {
                    anchorLineOffset --;
                    anchorOffsetInLine = getStringsNumFromLineOffset(anchorLineOffset) - 1;
                }
            }
            if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"].includes(e.key)) {
                if (!e.shiftKey) {
                    focusLineOffset = anchorLineOffset;
                    focusOffsetInLine = anchorOffsetInLine;
                }
                setCaretPosition();
            }
            if (e.key === "Backspace") {
                e.preventDefault(); // デフォルトの改行動作を無効化
                const [startOffset,endOffset] = getStartAndEndOffset();
                const minLineOffset = Math.min(anchorLineOffset, focusLineOffset);
                let insertBrCommand;
                if (cmdBool) {
                    insertBrCommand = new TextEditor_textSplice(this.sourceCode, getStringsOffsetFromLineOffset(minLineOffset), endOffset);
                    anchorOffsetInLine = 0;
                } else {
                    insertBrCommand = new TextEditor_textSplice(this.sourceCode, startOffset - 1, endOffset);
                    anchorOffsetInLine --;
                }
                anchorLineOffset = minLineOffset;
                if (anchorOffsetInLine < 0) {
                    anchorLineOffset --;
                    anchorOffsetInLine = getStringsNumFromLineOffset(anchorLineOffset);
                }
                insertBrCommand.update("");
                app.operator.appendCommand(insertBrCommand);
                app.operator.execute();
                focusLineOffset = anchorLineOffset;
                focusOffsetInLine = anchorOffsetInLine;
                setCaretPosition();
                selectionViewUpdate();
                return ;
            } else if (e.key === "Enter") {
                e.preventDefault(); // デフォルトの改行動作を無効化
                const insertBrCommand = new TextEditor_textSplice(this.sourceCode, ...getStartAndEndOffset());
                insertBrCommand.update("\n");
                app.operator.appendCommand(insertBrCommand);
                app.operator.execute();
                anchorLineOffset ++;
                anchorOffsetInLine = 0;
                focusLineOffset = anchorLineOffset;
                focusOffsetInLine = anchorOffsetInLine;
                setCaretPosition();
                return ;
            } else if ((e.ctrlKey || e.metaKey) && e.key === "/") {
                e.preventDefault(); // デフォルトの改行動作を無効化
                const minLineOffset = Math.min(anchorLineOffset, focusLineOffset);
                const offset = getStringsOffsetFromLineOffset(minLineOffset);
                let insertBrCommand;
                if (getStringsFromOffset(offset, offset + 2) == "//") {
                    insertBrCommand = new TextEditor_textSplice(this.sourceCode, offset, offset + 2);
                    insertBrCommand.update("");
                } else {
                    insertBrCommand = new TextEditor_textSplice(this.sourceCode, offset, offset);
                    insertBrCommand.update("//");
                }
                app.operator.appendCommand(insertBrCommand);
                app.operator.execute();
                return ;
            } else if (e.key === "Tab") {
                e.preventDefault(); // デフォルトの改行動作を無効化
                const insertBrCommand = new TextEditor_textSplice(this.sourceCode, ...getStartAndEndOffset());
                insertBrCommand.update("    ");
                app.operator.appendCommand(insertBrCommand);
                app.operator.execute();
                return ;
            } else if (e.key === "(") {
                e.preventDefault(); // デフォルトの改行動作を無効化
                const insertBrCommand = new TextEditor_textSplice(this.sourceCode, ...getStartAndEndOffset());
                insertBrCommand.update("()");
                app.operator.appendCommand(insertBrCommand);
                app.operator.execute();
                anchorOffsetInLine ++;
                focusLineOffset = anchorLineOffset;
                focusOffsetInLine = anchorOffsetInLine;
                setCaretPosition();
                return ;
            }
        });
        this.textViewArea.addEventListener("paste", (e) => {
            e.preventDefault(); // ブラウザの標準ペーストを止める
            // プレーンテキストを取得
            const text = (e.clipboardData || window.clipboardData).getData("text");
            const insertBrCommand = new TextEditor_textSplice(this.sourceCode, ...getStartAndEndOffset());
            insertBrCommand.update(text);
            app.operator.appendCommand(insertBrCommand);
            app.operator.execute();
        });
        document.addEventListener('copy', (e) => {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const { startContainer, endContainer } = range;
            if ((this.textViewArea.contains(startContainer) && this.textViewArea.contains(endContainer)) || this.input.contains(startContainer) && this.input.contains(endContainer)) {
                // デフォルトのコピー動作を停止
                e.preventDefault();
                // カスタム処理（例：URLを追加）
                const customText = this.sourceCode.object[this.sourceCode.parameter].slice(...getStartAndEndOffset());
                // クリップボードに設定
                e.clipboardData.setData('text/plain', customText);
            }
        });
        let command = null;
        let isInputFocus = false;
        let lastAnchorOffsetInLine = 0;
        // textViewAreaに対する入力・編集をすべてブロック
        this.textViewArea.addEventListener("beforeinput", () => {
            isInputFocus = true;
            input.focus();
            input.childNodes[0].nodeValue = "";
            suppressSelectionChange = true;
            const selection = window.getSelection();
            const range = document.createRange();
            range.setStart(input.childNodes[0],0); // 開始位置
            range.setEnd(input.childNodes[0],0); // 終了位置
            selection.removeAllRanges(); // 既存の選択をクリア
            selection.addRange(range);   // 新しい選択を追加
            // 選択状態の文字を消す
            command = new TextEditor_textSplice(this.sourceCode, ...getStartAndEndOffset());
            lastAnchorOffsetInLine = anchorOffsetInLine;
            app.operator.appendCommand(command);
        });
        input.addEventListener("keydown", (e) => {
            if (isInputFocus) {
                if (e.key == " ") {
                    command.update(input.textContent + " ");
                    app.operator.execute();
                    input.childNodes[0].nodeValue = "";
                    suppressSelectionChange = true;
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.setStart(input.childNodes[0],0); // 開始位置
                    range.setEnd(input.childNodes[0],0); // 終了位置
                    selection.removeAllRanges(); // 既存の選択をクリア
                    selection.addRange(range);   // 新しい選択を追加
                    command = new TextEditor_textSplice(this.sourceCode, ...getStartAndEndOffset());
                    lastAnchorOffsetInLine = anchorOffsetInLine;
                    app.operator.appendCommand(command);
                } else if (e.key === "Enter") {
                    isInputFocus = false;
                    e.preventDefault(); // デフォルトの改行動作を無効化
                    if (input.childNodes[0].nodeValue  === "\n") {
                        // 改行
                    } else {
                        // 決定
                        app.operator.execute();
                        input.childNodes[0].nodeValue = "";
                    }
                }
            }
        })
        input.addEventListener("beforeinput", () => {
            // input.childNodes[0].nodeValue = "";
        })
        const autocompleteFilter = (query) => {
            const calculateScore = (query, candidate) => {
                const lowerQuery = query.toLowerCase();
                const lowerCandidate = candidate.toLowerCase();
                let score = 0;
                // 1. 前方一致は高スコア
                if (lowerCandidate.startsWith(lowerQuery)) {
                    score += 100;
                }
                // 2. 単語境界での一致
                const words = candidate.split(/[_\-\s]/);
                for (const word of words) {
                    if (word.toLowerCase().startsWith(lowerQuery)) {
                    score += 50;
                    }
                }
                // 3. キャメルケースマッチング
                const camelMatches = candidate.match(/[A-Z]/g) || [];
                const camelString = camelMatches.join('').toLowerCase();
                if (camelString.includes(lowerQuery)) {
                    score += 30;
                }
                // 4. 部分文字列マッチ
                if (lowerCandidate.includes(lowerQuery)) {
                    score += 10;
                }
                // 5. fuzzy match
                function fuzzyMatch(query, candidate) {
                    let queryIndex = 0;
                    let score = 0;
                    let consecutiveMatches = 0;
                    for (let i = 0; i < candidate.length && queryIndex < query.length; i++) {
                        if (candidate[i].toLowerCase() === query[queryIndex].toLowerCase()) {
                            queryIndex++;
                            consecutiveMatches++;
                            score += consecutiveMatches * 2; // 連続マッチはより高いスコア
                        } else {
                            consecutiveMatches = 0;
                        }
                    }
                    return queryIndex === query.length ? score : 0;
                }
                score += fuzzyMatch(query, candidate);
                return score;
            }
            const candidates = usingValues.concat(usingFunctions).concat(reservedWords);
            const scored = candidates.map(candidate => ({
                item: candidate,
                score: calculateScore(query, candidate.name)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);
            return scored.map(item => item.item);
        }
        let usingValues = [];
        let usingFunctions = [];
        let reservedWords = [{name: "struct"}, {name: "if"}, {name: "else"}, {name: "return"}, {name: "vec2"}, {name: "vec3"}, {name: "vec4"}];
        input.addEventListener("input", () => {
            command.update(input.textContent);
            this.autocompleteArea.style.display = "block";
            const range = document.createRange();
            const result = getOffsetInLineTextAndOffset(this.textViewArea.children[focusLineOffset], anchorOffsetInLine);
            range.setStart(...result);   // 5文字目の直後
            range.setEnd(...result);
            const rect = range.getBoundingClientRect(); // その位置の矩形
            const editorRect = this.textViewArea.getBoundingClientRect();
            const left = rect.left - editorRect.left;
            const top = rect.top - editorRect.top;
            this.autocompleteArea.style.left = `${left}px`;
            this.autocompleteArea.style.top = `${top + 11.5}px`;
            this.autocompleteArea.replaceChildren();
            for (const value of autocompleteFilter(input.textContent)) {
                const liContainer = createTag(this.autocompleteArea, "div");
                setClass(liContainer, "autocompleteFilterItem");
                liContainer.addEventListener("mousedown", () => {
                    input.textContent = value.name;
                    command.update(input.textContent);
                })
                const icon = createIcon(liContainer); // 属性
                const name = createTag(liContainer, "div", {textContent: value.name}); // 変数や関数の名前
                setStyle(name, "color: rgb(224, 224, 224);");
                const padding0 = createTag(liContainer, "div");
                const text = createTag(liContainer, "div", {textContent: "詳細..."}); // ディティール
                setStyle(text, "color: rgb(90, 90, 90);");
                const padding1 = createTag(liContainer, "div");
            }
            anchorOffsetInLine = lastAnchorOffsetInLine + input.textContent.length;
            focusLineOffset = anchorLineOffset;
            focusOffsetInLine = anchorOffsetInLine;
            setCaretPosition();
        })

        input.addEventListener("focusout", () => {
            console.log("フォーカスが外れました")
            app.operator.execute();
            this.autocompleteArea.style.display = "none";
        })

        this.mainContainer.addEventListener('scroll', () => {
            if (isRestoringScroll) {
                this.mainContainer.scrollLeft = lastScrollX;
                this.mainContainer.scrollTop = lastScrollY;
                isRestoringScroll = false;
            } else {
                lastScrollX = this.mainContainer.scrollLeft;
                lastScrollY = this.mainContainer.scrollTop;
            }
        });

        const viewUpdate = () => {
            // lastScrollX = this.mainContainer.scrollLeft;
            // lastScrollY = this.mainContainer.scrollTop;
            // DOMリセット
            this.textViewArea.replaceChildren();
            this.lineNumbers.replaceChildren();
            this.functionsGroup.replaceChildren();
            this.valuesGroup.replaceChildren();
            // 改行で配列化
            const codeLines = this.sourceCode.object[this.sourceCode.parameter].match(/[^\n]*\n?/g).filter(line => line !== '');
            for (let i = 0; i < codeLines.length; i ++) {
                // 行番号
                createTag(this.lineNumbers, "div", {textContent: i});
                // 行を生成
                const l = createTag(this.textViewArea, "div");
                setStyle(l, "width: fit-content; height: fit-content; whiteSpace: pre; display: flex;");
            }
            const extractStructs = (code) => {
                const structRegex = /struct\s+([a-zA-Z_]\w*)\s*{[^}]*}/g;
                const structs = [];
                let match;
                while ((match = structRegex.exec(code)) !== null) {
                    structs.push({
                        name: match[1],
                        code: match[0],
                        values: [...match[0].matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g)].map(match => match[1])
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
            const tokens_ = this.sourceCode.object[this.sourceCode.parameter].match(/\/\/|[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー々]+|[a-zA-Z0-9_]+|[ \t]+|\r?\n|[^\w\s]/gu) || [];
            let lineNumber = 0;
            const usingStructs = extractStructs(this.sourceCode.object[this.sourceCode.parameter]);
            usingFunctions = extractFunctions(this.sourceCode.object[this.sourceCode.parameter]).concat(builtInFunction);
            usingValues = extractDeclaredVariables(this.sourceCode.object[this.sourceCode.parameter]);
            let state = "";
            for (const token of tokens_) {
                let color = "rgb(255, 255, 255)";
                if (token == "\n") {
                    // const l_ = createTag(codeArea.children[lineNumber], "br");
                    const l_ = createTag(this.textViewArea.children[lineNumber], "span", {textContent: token});
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
                } else if (usingValues.filter(value => value.name == token).length > 0) { // 変数
                    color = "rgb(103, 154, 220)";
                } else {
                    // const l_ = document.createTextNode(token)
                    // codeArea.children[lineNumber].append(l_);
                    // continue ;
                }
                const span = createTag(this.textViewArea.children[lineNumber], "span", {textContent: token});
                span.addEventListener("dblclick", (e) => {
                    [anchorLineOffset, anchorOffsetInLine] = getSelectionDataFromSpan(span, 0);
                    [focusLineOffset, focusOffsetInLine] = getSelectionDataFromSpan(span, span.textContent.length);
                    console.log(anchorLineOffset, anchorOffsetInLine)
                    console.log(focusLineOffset, focusOffsetInLine)
                    setCaretPosition();
                });
                setClass(span, "tokenSpan");
                setStyle(span, `color: ${color};`);
            }
            for (const fn of usingFunctions) {
                const l = createTag(this.functionsGroup, "div", {textContent: fn.name});
                setStyle(l, "width: fit-content; height: fit-content; whiteSpace: pre;");
            }
            for (const fn of usingValues) {
                const l = createTag(this.valuesGroup, "div", {textContent: fn.name});
                setStyle(l, "width: fit-content; height: fit-content; whiteSpace: pre;");
            }
            isRestoringScroll = true;
        };
        const debuglogUpdate = () => {
            const logContainer = createTag(this.debuglogAreaContainer, "div");
            setStyle(logContainer, "width: 100%; height: fit-content; display: grid; gridTemplateColumns: auto 1fr;");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.style.display = "none";
            checkbox.checked = true;
            const label = document.createElement("label");
            const span = document.createElement("span");
            span.classList.add("arrow");
            label.append(checkbox,span);
            logContainer.append(label);
            const logText = createTag(logContainer, "div", {textContent: this.sourceCode.object["result"]});
            checkbox.addEventListener("input", () => {
                if (checkbox.checked) {
                    logText.style.display = "block";
                } else {
                    logText.style.display = "none";
                }
            })
        }
        viewUpdate();
        debuglogUpdate();
        managerForDOMs.set({o: this.sourceCode.object, i: this.sourceCode.parameter, g: creatorForUI.groupID, f: flag}, viewUpdate);
        managerForDOMs.set({o: this.sourceCode.object, i: "result", g: creatorForUI.groupID, f: flag}, debuglogUpdate);
    }
}