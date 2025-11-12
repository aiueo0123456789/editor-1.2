import { ChecksTag, CustomTag } from "./customTag.js";
import { createGroupButton, createID, createRadios, createTag, managerForDOMs, setClass, setLabel, setStyle, updateRangeStyle } from "./util.js";
import { changeParameter, hexToRgba, isFunction, isNumber, isPassByReference, isPlainObject, rgbToHex } from "../utility.js";
import { app } from "../../../main.js";
import { MenuTag } from "./customTags/menuTag.js";
import { CodeEditorTag } from "./customTags/codeEditorTag.js";
import { SelectTag } from "./customTags/selectTag.js";
import { ChangeParameterCommand } from "../../commands/utile/utile.js";
import { createGrid } from "./grid.js";
import { OutlinerTag } from "./customTags/outlinerTag.js";
import { InputCheckboxTag } from "./customTags/inputCheckboxTag.js";
import { MeterTag } from "./customTags/meterTag.js";
import { HasKeyframeCheck } from "./customTags/hasKeyframeCheckTag.js";
import { TextureTag } from "./customTags/textureTag.js";
import { PathTag } from "./customTags/pathTag.js";
import { BoxTag } from "./customTags/boxTag.js";
import { InputTextTag } from "./customTags/inputTextTag.js";
import { InputColorTag } from "./customTags/inputColorTag.js";
import { InputFileTag } from "./customTags/inputFileTag.js";
import { InputNumberTag } from "./customTags/inputNumberTag.js";
import { ButtonTag } from "./customTags/buttonTag.js";
import { SectionTag } from "./customTags/sectionTag.js";
import { LabelTag } from "./customTags/labelTag.js";
import { GridBoxTag } from "./customTags/gridBoxTag.js";
import { DblClickInput } from "./customTags/dblclickInput.js";
import { PanelTag } from "./customTags/panelTag.js";
import { ListTag } from "./customTags/listTag.js";
import { CanvasTag } from "./customTags/canvasTag.js";
import { DualListboxTag } from "./customTags/dualListbox.js";
import { ParameterManagerTag } from "./customTags/parameterManagerTag.js";

function isFocus(t) {
    return document.hasFocus() && document.activeElement === t;
}

export function createSelect(t, list = []) {
    console.log("セレクトの生成", t, list);
    const container = createTag(t, "div");
    const select = createTag(container, "input", {style: "display: none;"});
    // const listContainer = createTag(container,"ul");
    container.classList.add("custom-select");
    const value = createTag(container, "p", {textContent: app.appConfig.language["noSelected"]});
    const isOpen = createTag(container, "span", {class: "downArrow"});
    container.addEventListener("click", (e) => {
        const rect = container.getBoundingClientRect();
        const listContainer = app.ui.creatorForUI.getDOMFromID("custom-select-items");
        listContainer.style.left = `${rect.left}px`;
        listContainer.style.top = `${rect.top + 15}px`;
        listContainer.replaceChildren();
        listContainer.classList.remove("hidden");
        function removeFn() {
            listContainer.replaceChildren();
            listContainer.classList.add("hidden");
            document.removeEventListener("click", removeFn); // ドキュメントからイベントリスナーを削除
        }
        for (const item of list) {
            const option = createTag(listContainer, "li");
            const inner = createTag(option, "p", {textContent: item});
            option.addEventListener("click", () => {
                select.value = item;
                // change イベントを手動で発火させる
                select.dispatchEvent(new Event("change", { bubbles: true }));
                value.textContent = item;
                removeFn();
            })
        }
        document.addEventListener("click", removeFn); // セレクト以外がクリックされたら(ドキュメント)非表示
        e.stopPropagation();
    })
    return select;
}

export const tagCreater = {
    // 要素の作成
    "box": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new BoxTag(/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag);
    },
    "codeEditor": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new CodeEditorTag(/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag);
    },
    "text": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        let element = createTag(t, "p");
        setClass(element, "text");
        const update = () => {
            element.textContent = creatorForUI.getParameter(searchTarget, child.withObject);
        }
        update();
        creatorForUI.setUpdateEventByPath(searchTarget, child.withObject, update, flag);
        return element;
    },
    "heightCenter": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        let element = createTag(t, "div");
        setClass(element, "heightCenter");
        if (child.children) {
            creatorForUI.createFromChildren(element, null, child.children, searchTarget, flag);
        }
        return element;
    },
    "title": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        let element = createTag(t, "div", {textContent: child.text});
        return element;
    },
    "div": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        let element = createTag(t, "div", child?.options);
        if (child.children) {
            creatorForUI.createFromChildren(element, null, child.children, searchTarget, flag);
        }
        return element;
    },
    "input": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => { // 入力
        let element;
        if (child.type == "text") {
            element = new InputTextTag(/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag);
        } else if (child.type == "file") {
            element = new InputFileTag(/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag);
        } else if (child.type == "color") {
            element = new InputColorTag(/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag);
        } else if (child.type == "checkbox") {
            element = new InputCheckboxTag(/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag);
        } else { // 数字型
            element = new InputNumberTag(/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag);
        }
        if (child.custom && "collision" in child.custom && !child.custom.collision) {
            element.element.style.pointerEvents = "none";
        }
        return element;
    },
    "button": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new ButtonTag(/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag);
    },
    "buttons": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        createGroupButton(t, [{icon: "グループ", label: "a"},{icon: "グループ", label: "b"},{icon: "グループ", label: "c"}]);
    },
    "radios": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        createRadios(t, [{icon: "グループ", label: "a"},{icon: "グループ", label: "b"},{icon: "グループ", label: "c"}]);
    },
    "checks": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        const a = (child.withObjects).map((data, index) => {
            return {icon: "グループ", label: data.text};
        });
        let element = new ChecksTag(t, a);
        child.withObjects.forEach((data, index) => {
            creatorForUI.setWith(element.checks[index], data.path, searchTarget);
        })
        return element;
    },
    "select": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new SelectTag(/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag);
    },
    "menu": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        let element = new MenuTag(t, child.title, child.struct, child?.options);
        return element;
    },
    "dblClickInput": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => { // ダブルクッリク入力
        return new DblClickInput(creatorForUI,t,parent,searchTarget,child,flag);
    },
    "list": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new ListTag(/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag);
    },
    "container": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        let element = createTag(t, "ul");
        if (child.children) {
            creatorForUI.createFromChildren(element, null, child.children, searchTarget, flag);
        }
        return element;
    },
    "section": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new SectionTag(creatorForUI,t,parent,searchTarget,child,flag);
    },
    "panel": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new PanelTag(creatorForUI,t,parent,searchTarget,child,flag);
    },
    "option": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        let element = createTag(t, "div", {class: "ui_options"});
        if (child.children) {
            creatorForUI.createFromChildren(element, null, child.children, searchTarget, flag);
        }
        return element;
    },
    "icon": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        const container = createTag(t, "div");
        container.classList.add("icon");
        const img = createTag(container, "img");
        let src = child.src;
        if (src.path) {
            src = creatorForUI.getParameter(searchTarget, src.path);
        }
        img.src = app.ui.getImgURLFromImgName(src);
        return container;
    },
    "flexBox": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        let element = createTag(t, "div");
        element.style.display = "flex";
        element.style.gap = child.interval;
        element.style.width = "fit-content";
        if (child.children) {
            creatorForUI.createFromChildren(element, null, child.children, searchTarget, flag);
        }
        return element;
    },
    "grid": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        let element = createGrid(t, child.axis);
        creatorForUI.createFromChildren(element.child1, null, child.child1, searchTarget, flag);
        creatorForUI.createFromChildren(element.child2, null, child.child2, searchTarget, flag);
        return element;
    },
    "gridBox": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new GridBoxTag(creatorForUI,t,parent,searchTarget,child,flag);
    },
    "padding": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        let element = createTag(t, "div");
        element.style.width = child.size;
        return element;
    },
    "separator": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        let element = createTag(t, "span");
        element.classList.add("separator");
        element.style.width = child.size;
        return element;
    },
    "outliner": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new OutlinerTag(creatorForUI,t,parent,searchTarget,child,flag);
    },
    "scrollable": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        let element = createTag(t, "div", {class: "scrollable"});
        if (child.children) {
            creatorForUI.createFromChildren(element, null, child.children, searchTarget, flag);
        }
        return element;
    },
    "canvas": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new CanvasTag(creatorForUI,t,parent,searchTarget,child,flag);
    },
    "path": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new PathTag(creatorForUI,t,parent,searchTarget,child,flag);
    },
    "if": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        // console.log(searchTarget, child, creatorForUI.getParameter(searchTarget,child.formula.source))
        let bool = false;
        if (child.formula.conditions == "==") {
            bool = creatorForUI.getParameter(searchTarget,child.formula.source) == child.formula.value;
        } else if (child.formula.conditions == ">") {
            bool = creatorForUI.getParameter(searchTarget,child.formula.source) > child.formula.value;
        } else if (child.formula.conditions == "<") {
            bool = creatorForUI.getParameter(searchTarget,child.formula.source) < child.formula.value;
        } else if (child.formula.conditions == "in") {
            bool = child.formula.value in creatorForUI.getParameter(searchTarget,child.formula.source);
        }
        if (bool) {
            if (child.true) {
                return creatorForUI.createFromChildren(t, null, child.true, searchTarget, flag);
            }
        } else {
            if (child.false) {
                return creatorForUI.createFromChildren(t, null, child.false, searchTarget, flag);
            }
        }
    },
    "hasKeyframeCheck": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new HasKeyframeCheck(creatorForUI,t,parent,searchTarget,child,flag);
    },
    "nodeFromFunction": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        const functionResult = creatorForUI.getParameter(searchTarget, child.source)();
        return creatorForUI.createFromChildren(t, null, functionResult, searchTarget, flag);
    },
    "html": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        const element = createTag(t, child.tag);
        if (child.children) {
            creatorForUI.createFromChildren(element, null, child.children, searchTarget, flag);
        }
        return element;
    },
    "meter": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new MeterTag(creatorForUI,t,parent,searchTarget,child,flag);
    },
    "texture": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new TextureTag(creatorForUI,t,parent,searchTarget,child,flag);
    },
    "dualListbox": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new DualListboxTag(creatorForUI,t,parent,searchTarget,child,flag);
    },
    "color": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        if (t instanceof HTMLElement) t.style.backgroundColor = creatorForUI.getParameter(searchTarget, child.src);
        else t.element.style.backgroundColor = creatorForUI.getParameter(searchTarget, child.src);
        return null;
    },
    "parameterManager": (/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) => {
        return new ParameterManagerTag(creatorForUI,t,parent,searchTarget,child,flag);
    },
}

export class ParameterReference {
    constructor(object, parameter) {
        this.object = object;
        this.parameter = parameter;
    }

    get value() {
        return this.object[this.parameter];
    }
}

// UIを作るクラス
export class CreatorForUI {
    static tagAppendChildren(t, children) {
        let appendTarget = t instanceof HTMLElement ? t : t.element;
        for (const child of children) {
            let appendChild = child instanceof HTMLElement ? child : child.element;
            appendTarget.append(appendChild);
        }
    }
    constructor() {
        this.groupID = createID();
        this.dom = null;
        this.lists = new Map();

        this.globalInputObject = {};

        this.domKeeper = new Map();
    }

    setUpdateEventByPath(searchTarget, path, event, flag) {
        const template = flag ? {g: this.groupID, f: flag} : {g: this.groupID};
        try {
            // pathをもとに参照
            let useSearchTarget;
            // 一般的
            if (path[0] == "/") {
                path = path.slice(1);
                useSearchTarget = searchTarget.normal;
            } else if (path[0] == "!") {
                path = path.slice(1);
                useSearchTarget = searchTarget.special;
            } else {
                useSearchTarget = this.globalInputObject;
            }
            if (path == "") {
                managerForDOMs.set(Object.assign(template,{o: useSearchTarget}), event);
            }
            let roots = [];
            if (path.includes("{") && path.includes("}")) {
                const matches = [];
                // {〜} 部分を抽出しつつ置換
                let checked = false;
                let replaced = path.replace(/\{([^{}]*)\}/g, (match, content, index) => {
                    const currentIndex = matches.length;
                    if (path[index - 1] == "%") {
                        checked = true;
                        matches.push(`%${this.getParameter(searchTarget, content)}`);
                    } else matches.push(this.getParameter(searchTarget, content));
                    return `&${currentIndex}`;
                });
                if (checked) replaced = replaced.replace("%", "");
                roots = replaced.split("/").map(root => {
                    if (root[0] == "&") return matches[root.slice(1)];
                    else return root;
                });
            } else {
                // 一般的
                roots = path.split("/");
            }
            roots = roots.map(root => {
                if (isNumber(root)) return Number(root)
                else return root;
            });
            const root = roots.slice(0, -1);
            let lastRoot = roots[roots.length - 1];
            let lastIsParameter = false;
            if (lastRoot[0] == "%") { // ~/%parameterNameの場合オブジェクト内のidを対象とする
                lastRoot = lastRoot.slice(1); // %を取り除く
                lastIsParameter = true;
            }
            let object = useSearchTarget;
            for (let next of root) {
                if (next in object) {
                    object = object[next];
                } else {
                    return null;
                }
            }
            if (lastIsParameter) {
                return managerForDOMs.set(Object.assign(template,{o: object, i: lastRoot}), event);
            } else {
                const final = object[lastRoot];
                if (isPassByReference(final)) {
                    return managerForDOMs.set(Object.assign(template,{o: final}), event);
                } else {
                    return managerForDOMs.set(Object.assign(template,{o: object, i: lastRoot}), event);
                }
            }
        } catch {
            console.trace("値の取得", path, searchTarget, "でエラーが出ました");
        }
    }

    getParameter(searchTarget, path, option = 0) {
        try {
            let useSearchTarget;
            path = path.replace("%", ""); // %はじゃまなので削除
            // 一般的
            if (path[0] == "/") {
                path = path.slice(1);
                useSearchTarget = searchTarget.normal;
            } else if (path[0] == "!") {
                path = path.slice(1);
                useSearchTarget = searchTarget.special;
            } else {
                useSearchTarget = this.globalInputObject;
            }
            if (path == "") {
                return useSearchTarget;
            }
            let roots = [];
            if (path.includes("{") && path.includes("}")) {
                const matches = [];
                // {〜} 部分を抽出しつつ置換
                const replaced = path.replace(/\{([^{}]*)\}/g, (match, content, index) => {
                    const currentIndex = matches.length;
                    matches.push(this.getParameter(searchTarget, content));
                    return `&${currentIndex}`;
                });
                roots = replaced.split("/").map(root => {
                    if (root[0] == "&") return matches[root.slice(1)];
                    else return root;
                });
            } else {
                // 一般的
                roots = path.split("/");
            }
            roots = roots.map(root => {
                if (isNumber(root)) return Number(root)
                else return root;
            });
            const root = roots.slice(0, -1);
            let lastRoot = roots[roots.length - 1];
            let object = useSearchTarget;
            for (let next of root) {
                if (object instanceof Map) {
                    object = object.get(next);
                } else if (next in object) {
                    object = object[next];
                } else {
                    return null;
                }
            }
            let final;
            if (object instanceof Map) {
                final = object.get(lastRoot);
            } else if (lastRoot in object) {
                final = object[lastRoot];
            } else {
                return null;
            }
            if (option == 1) { // optionが1ならParameterReference型で返す
                return new ParameterReference(object, lastRoot);
            } else {
                if (isFunction(final)) {
                    return final.bind(object);
                } else if (isPassByReference(final)) {
                    return final;
                } else {
                    if (option == 2) {
                        return new ParameterReference(object, lastRoot);
                    } else {
                        return final;
                    }
                }
            }
        } catch(e) {
            // console.error(e);
            console.warn("値の取得", path, searchTarget, "でエラーが出ました");
        }
    }

    removeReference(tagData) {
        if (tagData.id) {
            let id = "";
            if (tagData.id.path) {
                id = this.getParameter(searchTarget, tagData.id.path);
            } else {
                id = tagData.id;
            }
            this.domKeeper.delete(id);
        }
    }

    // inputとselectを値と関連付ける
    setWith(/** @type {HTMLElement} */t, path, searchTarget, flag, useCommand = true) {
        let source = this.getParameter(searchTarget, path, 1);
        if (!source) { // 取得できなかったら切り上げ
            console.warn("UIとパラメータの連携ができませんでした", path, searchTarget, this.globalInputObject);
            if (t.type == "number" || t.type == "range") { // 数字型
                t.value = 0.5;
            } else if (t.type == "color") {
                t.value = rgbToHex(0,0,0,1);
            } else {
                t.value = "エラー";
            }
            return ;
        }
        // 値を関連づけ
        let updateDOMsValue = null;
        if (t.type == "checkbox") {
            updateDOMsValue = () => {
                t.checked = source.value;
            };
        } else if (t.type == "range") {
            updateDOMsValue = () => {
                t.value = source.value;
                updateRangeStyle(t);
            };
        } else if (t.type == "color") {
            updateDOMsValue = () => {
                t.value = rgbToHex(...source.value);
            };
        } else {
            updateDOMsValue = () => {
                if (!isFocus(t)) {
                    t.value = source.value;
                }
            };
        }
        let command;
        // イベントを作成
        const update = () => {
            let newValue;
            if (t.type == "number" || t.type == "range") newValue = Number(t.value);
            else if (t.type == "checkbox") newValue = t.checked;
            else if (t.type == "color") {
                const valueColor = hexToRgba(t.value, 1);
                newValue = valueColor;
            } else if (t.tagName === "SELECT") newValue = t.value;
            else newValue = t.value;
            if (useCommand) {
                if (command) command.update(newValue); // commandがある場合は値だけ更新
                else command = new ChangeParameterCommand(source.object, source.parameter, newValue); // commandを作成
            } else changeParameter(source.object, source.parameter, newValue);
        }
        t.addEventListener("input", update);
        t.addEventListener("change", () => {
            update();
            if (useCommand) { // commandを実行
                app.operator.appendCommand(command);
                app.operator.execute();
                command = null;
            }
        })
        updateDOMsValue();
        return this.setUpdateEventByPath(searchTarget, path, updateDOMsValue, flag);
    }

    // 任意のパラメーターと値を関連付ける
    setWithParameter(/** @type {HTMLElement} */t, withObject, searchTarget, flag, parameter) {
        let source = this.getParameter(searchTarget, withObject, 1);
        if (!source) { // 取得できなかったら切り上げ
            console.warn("UIとパラメータの連携ができませんでした", withObject, searchTarget);
            t[parameter] = 0.5;
            return ;
        }
        // 値を関連づけ
        let updateDOMsValue = () => {
            t[parameter] = source.value;
        };
        updateDOMsValue();
        this.setUpdateEventByPath(searchTarget, withObject, updateDOMsValue, flag);
        // let command;
        // // イベントを作成
        // t.addEventListener("input", () => {
        //     let newValue;
        //     if (t.type == "number" || t.type == "range") { // 数字型
        //         newValue = Number(t.value);
        //     } else if (t.type == "checkbox") {
        //         newValue = t.checked;
        //     } else if (t.type == "color") {
        //         const valueColor = hexToRgba(t.value, 1);
        //         newValue = valueColor;
        //     } else if (t.tagName === "SELECT") {
        //         newValue = t.value;
        //     } else {
        //         newValue = t.value;
        //     }
        //     if (command) {
        //         command.update(newValue);
        //     } else {
        //         command = new ChangeParameterCommand(source.object, source.parameter, newValue);
        //     }
        // });
        // t.addEventListener("change", () => {
        //     app.operator.appendCommand(command);
        //     app.operator.execute();
        //     command = null;
        // })
    }

    // 構造の配列をもとにDOMの構築
    createFromChildren(/** @type {HTMLElement} */t, parent, struct, searchTarget, flag = "defo") {
        // const myChildrenTag = [...childrenTag];
        const myChildrenTag = [];
        for (const child of struct) {
            /** @type {HTMLElement} */
            let element;
            // 要素の作成
            try {
                element = tagCreater[child.tagType](this, t, parent, searchTarget, child, flag);
            } catch (e) {
                console.error(e)
                console.log(child.tagType)
            }
            try {
                if (element) {
                    if (element instanceof CustomTag && element.isSetLabel || element instanceof HTMLElement) {
                        const setTarget = element instanceof HTMLElement ? element : element.element;
                        if (child.style) {
                            setStyle(setTarget, child.style);
                        }
                        if (child.class) {
                            setClass(setTarget, child.class);
                        }
                        if (child.event) {
                            for (const eventName in child.event) {
                                setTarget.addEventListener(eventName, () => {
                                    child.event[eventName](searchTarget, element);
                                })
                            }
                        }
                        if (child.id) {
                            let id = "";
                            if (child.id.path) {
                                id = this.getParameter(searchTarget, child.id.path);
                            } else {
                                id = child.id;
                            }
                            this.domKeeper.set(id, element);
                        }
                        if (child.label) element = new LabelTag(setTarget, child.label);
                        if (child.labelIn) {
                            const label = createTag(t, "label");
                            const span = createTag(label, "span");
                            span.textContent = child.labelIn;
                            label.append(setTarget);
                        }
                    }
                }
            } catch (e) {
                console.error(e)
                console.error("属性の付与に失敗しました", child)
            }
            if (Array.isArray(element)) {
                myChildrenTag.push(...element);
            } else {
                myChildrenTag.push(element);
            }
        }
        return myChildrenTag;
    }

    create(/** @type {HTMLElement} */target, struct, options = {heightCN: false, padding: true}) {
        this.remove();
        this.dom = target;
        this.globalInputObject = struct.inputObject; // グローバル参照

        const t = createTag(target, "div");

        if (options.off) {
            t.style.height = "100%";
            t.style.width = "100%";
        } else if (options.class) {
            t.classList.add(options.class);
        } else if (options?.heightCN) {
            t.classList.add("ui_container_1");
        } else if (options?.padding) {
            t.classList.add("ui_container_0");
        } else {
            t.style.height = "100%";
            t.style.width = "100%";
        }
        this.createFromChildren(t, null,struct.DOM, {normal: struct.inputObject, special: {}});
    }

    shelfeCreate(/** @type {HTMLElement} */target, struct) {
        this.remove();
        this.dom = target;
        this.globalInputObject = struct.inputObject; // グローバル参照
        this.createFromChildren(target, null,struct.DOM, {normal: struct.inputObject, special: {}});
    }

    getDOMFromID(id) {
        return this.domKeeper.get(id);
    }

    remove() {
        if (this.dom instanceof HTMLElement) {
            this.dom.replaceChildren();
        }
        this.globalInputObject = {};
        this.lists.clear();
        this.domKeeper.clear();
        managerForDOMs.delete({g: this.groupID});
    }
}

export class Shelfe {
    constructor() {
        this.submitData = {};
    }
}