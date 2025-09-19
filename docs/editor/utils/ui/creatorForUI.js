import { ChecksTag } from "./customTags.js";
import { createButton, createChecks, createDoubleClickInput, createGroupButton, createIcon, createID, createMinList, createRadios, createRange, createSection, createTag, managerForDOMs, setClass, setLabel, setStyle, updateRangeStyle } from "./util.js";
import { arrayToArrayCopy, changeParameter, hexToRgba, isFunction, isNumber, isPassByReference, isPlainObject, IsString, rgbToHex } from "../utility.js";
import { KeyframeBlock } from "../../core/objects/keyframe.js";
import { removeObjectInHTMLElement } from "./eventUpdator.js";
import { ResizerForDOM } from "./resizer.js";
import { app } from "../../app/app.js";
import { MenuTag } from "./customTags/menuTag.js";
import { CodeEditorTag } from "./customTags/codeEditorTag.js";
import { SelectTag } from "./customTags/selectTag.js";
import { ChangeParameterCommand } from "../../commands/utile/utile.js";
import { createGrid } from "./grid.js";
import { OutlinerTag } from "./customTags/outliner.js";
import { Checkbox } from "./customTags/checkbox.js";

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
        const listContainer = document.getElementById("custom-select-items");
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

function createCheckbox(t, type = "custom-checkbox", text = "") {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.style.display = "none";
    const label = document.createElement("label");
    // label.classList.add("box");
    label.setAttribute("name", "checkbox");
    const span = document.createElement("span");
    if (type == "eye-icon") { // 表示/非表示
        span.classList.add("eye-icon-container");
        const eye = document.createElement("span");
        eye.classList.add("eye-icon");
        label.append(eye);
        const pupil = document.createElement("span");
        pupil.classList.add("eye-icon-pupil");
        span.append(eye, pupil);
    } else {
        if (type == "button-checkbox") {
            const textTag = document.createElement("p");
            textTag.textContent = `${text}`;
            textTag.classList.add("button-checkbox-text");
            span.append(textTag);
        }
        span.classList.add(type);
    }
    label.append(checkbox,span);
    t.append(label);
    return checkbox;
}

export const tagCreater = {
    // 要素の作成
    "boxs": (this_,t,searchTarget,child,flag) => {
        let element = createTag(t, "div");
        setClass(element, "boxs")
        if (child.children) {
            this_.createFromChildren(element, child.children, searchTarget, flag);
        }
        return element;
    },
    "codeEditor": (this_,t,searchTarget,child,flag) => {
        return new CodeEditorTag(this_,t,searchTarget,child,flag);
    },
    "text": (this_,t,searchTarget,child,flag) => {
        let element = createTag(t, "p");
        setClass(element, "text")
        const update = () => {
            element.textContent = this_.getParameter(searchTarget, child.withObject);
        }
        update();
        this_.setUpdateEventToParameter(searchTarget, child.withObject, update, flag);
        return element;
    },
    "heightCenter": (this_,t,searchTarget,child,flag) => {
        let element = createTag(t, "div");
        setClass(element, "heightCenter");
        if (child.children) {
            this_.createFromChildren(element, child.children, searchTarget, flag);
        }
        return element;
    },
    "title": (this_,t,searchTarget,child,flag) => {
        let element = createTag(t, "div", {textContent: child.text});
        return element;
    },
    "div": (this_,t,searchTarget,child,flag) => {
        let element = createTag(t, "div", child?.options);
        if (child.children) {
            this_.createFromChildren(element, child.children, searchTarget, flag);
        }
        return element;
    },
    "input": (this_,t,searchTarget,child,flag) => { // 入力
        let element;
        if (!child.options) return ;
        if (child.options.type == "text") {
            element = createTag(t, "input", child.options);
            this_.setWith(element, child.withObject, searchTarget, flag);
        } else if (child.options.type == "checkbox") {
            element = new Checkbox(this_,t,searchTarget,child,flag);
        } else if (child.options.type == "color") {
            element = createTag(t, "input", child.options);
            this_.setWith(element, child.withObject, searchTarget, flag);
        } else { // 数字型
            if (child.custom?.visual) {
                element = createTag(t, "input", {type: "number"});
                this_.setWith(element, child.withObject, searchTarget, flag);
            } else {
                element = createTag(t, "div");
                element.style.width = "100%";
                element.style.display = "grid";
                element.style.gridTemplateColumns = "1fr 50px";
                /** @type {HTMLElement} */
                const range = createRange(element, child.options);
                range.style.gridColumn = "1/2";
                range.style.borderTopRightRadius = "0px";
                range.style.borderBottomRightRadius = "0px";
                this_.setWith(range, child.withObject, searchTarget, flag);
                /** @type {HTMLElement} */
                const number = createTag(element, "input", {type: "number"});
                number.style.gridColumn = "2/3";
                number.style.borderTopLeftRadius = "0px";
                number.style.borderBottomLeftRadius = "0px";
                this_.setWith(number, child.withObject, searchTarget, flag);
            }
        }
        if (child.custom && "collision" in child.custom && !child.custom.collision) {
            element.style.pointerEvents = "none";
        }
        return element;
    },
    "button": (this_,t,searchTarget,child,flag) => {
        let element;
        if (child.options.look) {
            const label = createTag(t, "label");
            setClass(label, "box")
            element = createTag(label, "button");
            setClass(element, child.options.look)
        } else {
            if (child.icon) {
                element = createButton(t, "グループ", child.label);
            } else {
                element = createTag(t, "button", child.options);
            }
        }
        if (isFunction(child.submitFunction)) {
            element.addEventListener("click", () => {
                child.submitFunction();
            })
        }
    },
    "buttons": (this_,t,searchTarget,child,flag) => {
        createGroupButton(t, [{icon: "グループ", label: "a"},{icon: "グループ", label: "b"},{icon: "グループ", label: "c"}]);
    },
    "radios": (this_,t,searchTarget,child,flag) => {
        createRadios(t, [{icon: "グループ", label: "a"},{icon: "グループ", label: "b"},{icon: "グループ", label: "c"}]);
    },
    "checks": (this_,t,searchTarget,child,flag) => {
        const a = (child.withObjects).map((data, index) => {
            return {icon: "グループ", label: data.text};
        });
        let element = new ChecksTag(t, a);
        // this_.createListWith(checks.checks, child.withObjects, searchTarget, child.customIndex, flag);
        child.withObjects.forEach((data, index) => {
            this_.setWith(element.checks[index], data.path, searchTarget);
        })
        return element;
    },
    "select": (this_,t,searchTarget,child,flag) => {
        return new SelectTag(this_,t,searchTarget,child,flag);
    },
    "menu": (this_,t,searchTarget,child,flag) => {
        let element = new MenuTag(t, child.title, child.struct, child?.options);
        return element;
    },
    "dbInput": (this_,t,searchTarget,child,flag) => { // ダブルクッリク入力
        let element = createDoubleClickInput();
        t.append(element);
        this_.setWith(element, child.withObject, searchTarget, flag);
        return element;
    },
    "list": (this_,t,searchTarget,child,flag) => {
        let element;
        if (child.options.type == "min") {
            element = createMinList(t,child.label);
            const listOutputData = this_.createListChildren(element.list, child.liStruct, child.withObject, searchTarget, child.options, flag);
            if (child.appendEvent) {
                if (isFunction(child.appendEvent)) {
                    element.appendButton.addEventListener("click", child.appendEvent);
                }
            } else {
                element.appendButton.classList.add("color2");
                element.appendButton.style.pointerEvents = "none";
            }
            if (child.deleteEvent) {
                if (isFunction(child.deleteEvent)) {
                    element.deleteButton.addEventListener("click", () => {
                        console.log("削除", listOutputData)
                        child.deleteEvent(listOutputData.selects);
                    });
                }
            } else {
                element.deleteButton.classList.add("color2");
                element.deleteButton.style.pointerEvents = "none";
            }
        } else if (child.options.type == "noScroll") {
            element = createTag(t, "ul");
            this_.createListChildren(element, child.liStruct, child.withObject, searchTarget, child.options, flag);
        } else if (child.options.type == "row") {
            element = createTag(t, "ul", {class: "flexRow"});
            this_.createListChildren(element, child.liStruct, child.withObject, searchTarget, child.options, flag);
        } else {
            element = createTag(t, "ul", {class: "scrollable"});
            this_.createListChildren(element, child.liStruct, child.withObject, searchTarget, child.options, flag);
        }
        // managerForDOMs.set({o: "", g: this_.groupID, f: flag}, element, null);
        return element;
    },
    "container": (this_,t,searchTarget,child,flag) => {
        let element = createTag(t, "ul");
        if (child.children) {
            this_.createFromChildren(element, child.children, searchTarget, flag);
        }
        return element;
    },
    "section": (this_,t,searchTarget,child,flag) => {
        const div = document.createElement("div");
        div.classList.add("section-main");
        let element;
        if (child.options?.min) {
            element = createSection(t,child.name,div, "minSection");
        } else {
            element = createSection(t,child.name,div);
        }
        if (child.children) {
            this_.createFromChildren(div, child.children, searchTarget, flag);
        }
        // managerForDOMs.set({o: "", g: this_.groupID, f: flag}, div, null);
        return element;
    },
    "option": (this_,t,searchTarget,child,flag) => {
        let element = createTag(t, "div", {class: "ui_options"});
        if (child.children) {
            this_.createFromChildren(element, child.children, searchTarget, flag);
        }
        return element;
    },
    "icon-img": (this_,t,searchTarget,child,flag) => {
        // console.log(this_.getParameter(searchTarget, child.withObject));
        let element = createIcon(t, this_.getParameter(searchTarget, child.withObject));
        return element;
    },
    "flexBox": (this_,t,searchTarget,child,flag) => {
        let element = createTag(t, "div");
        element.style.display = "flex";
        element.style.gap = child.interval;
        if (child.children) {
            this_.createFromChildren(element, child.children, searchTarget, flag);
        }
        return element;
    },
    "grid": (this_,t,searchTarget,child,flag) => {
        let element = createGrid(t, child.axis);
        this_.createFromChildren(element.child1, child.child1, searchTarget, flag);
        this_.createFromChildren(element.child2, child.child2, searchTarget, flag);
        return element;
    },
    "gridBox": (this_,t,searchTarget,child,flag) => {
        let element = createTag(t, "div");
        element.style.display = "grid";
        if (child.axis == "r") {
            element.style.gridTemplateRows = child.allocation;
        } else {
            element.style.gridTemplateColumns = child.allocation;
        }
        if (child.children) {
            this_.createFromChildren(element, child.children, searchTarget, flag);
        }
        return element;
    },
    "padding": (this_,t,searchTarget,child,flag) => {
        let element = createTag(t, "div");
        element.style.width = child.size;
        return element;
    },
    "separator": (this_,t,searchTarget,child,flag) => {
        let element = createTag(t, "span");
        element.classList.add("separator");
        element.style.width = child.size;
        return element;
    },
    "outliner": (this_,t,searchTarget,child,flag) => {
        return new OutlinerTag(this_, t, searchTarget, child, flag);
    },
    "scrollable": (this_,t,searchTarget,child,flag) => {
        let element = createTag(t, "div", {class: "scrollable"});
        if (child.children) {
            this_.createFromChildren(element, child.children, searchTarget, flag);
        }
        return element;
    },
    "box": (this_,t,searchTarget,child,flag) => {
        let element = createTag(t, "div");
        if (child.children) {
            this_.createFromChildren(element, child.children, searchTarget, flag);
        }
        return element;
    },
    "canvas": (this_,t,searchTarget,child,flag) => {
        let element = createTag(t, "canvas");
        return element;
    },
    "path": (this_,t,searchTarget,child,flag) => {
        const elementInsertIndex = t.children.length;
        let children = [];
        const myFlag = createID();
        const childrenReset = () => {
            managerForDOMs.deleteFlag(myFlag);
            // 関連づけられていない小要素を削除
            for (const childTag of children) {
                childTag?.remove();
                removeObjectInHTMLElement(childTag);
            }
            children.length = 0;
            const keep = createTag(null, "div");
            if (child.children) {
                const o = this_.getParameter(searchTarget, child.sourceObject, 2);
                if (o) {
                    if (isFunction(o)) {
                        children = this_.createFromChildren(keep, child.children, o(), myFlag, true);
                    } else if (o instanceof ParameterReference) {
                        // console.warn("伝播できません", o)
                        if ("errorChildren" in child) {
                            children = this_.createFromChildren(keep, child.errorChildren, {}, myFlag, true);
                        }
                    } else {
                        children = this_.createFromChildren(keep, child.children, o, myFlag, true);
                    }
                }
            }
            for (const childTag of Array.from(keep.children).reverse()) {
                t.insertBefore(childTag,t.children[elementInsertIndex]);
            }
            keep.remove();
        }
        if (isPlainObject(child.updateEventTarget)) {
            this_.setUpdateEventToParameter(searchTarget, child.updateEventTarget.path, childrenReset);
        } else { // 文字列に対応
            managerForDOMs.set({o: child.updateEventTarget, g: this_.groupID, f: flag},null,childrenReset);
        }
        childrenReset();
    },
    "if": (this_,t,searchTarget,child,flag) => {
        // console.log(searchTarget, child, this_.getParameter(searchTarget,child.formula.source))
        let bool = false;
        if (child.formula.conditions == "==") {
            bool = this_.getParameter(searchTarget,child.formula.source) == child.formula.value;
        } else if (child.formula.conditions == ">") {
            bool = this_.getParameter(searchTarget,child.formula.source) > child.formula.value;
        } else if (child.formula.conditions == "<") {
            bool = this_.getParameter(searchTarget,child.formula.source) < child.formula.value;
        } else if (child.formula.conditions == "in") {
            bool = child.formula.value in this_.getParameter(searchTarget,child.formula.source);
        }
        if (bool) {
            if (child.true) {
                return this_.createFromChildren(t, child.true, searchTarget, flag, true);
            }
        } else {
            if (child.false) {
                return this_.createFromChildren(t, child.false, searchTarget, flag, true);
            }
        }
    },
    "hasKeyframeCheck": (this_,t,searchTarget,child,flag) => {
        const checkbox = createTag(t, "input", {type: "checkbox"});
        /** @type {KeyframeBlock} */
        const object = this_.getParameter(searchTarget, child.targetObject);
        const update = () => {
            checkbox.checked = object.hasKeyFromFrame(app.scene.frame_current, 0.2);
        }
        checkbox.addEventListener("click", () => {
            if (object.hasKeyFromFrame(app.scene.frame_current, 0.2)) {
            } else {
                object.insert(app.scene.frame_current, object.targetObject[object.targetValue], 0.2);
            }
        })
        update();
        // this_.setUpdateEventToParameter(searchTarget, child.targetObject, update, );
        managerForDOMs.set({o: app.scene, i: "frame_current", f: flag, g: this_.groupID}, null, update);
        managerForDOMs.set({o: object, i: "keys", f: flag, g: this_.groupID}, null, update);
        return checkbox;
    },
    "nodeFromFunction": (this_,t,searchTarget,child,flag) => {
        const functionResult = this_.getParameter(searchTarget, child.source)();
        this_.createFromChildren(t, functionResult, searchTarget, flag);
    }
}


class ParameterReference {
    constructor(object, parameter) {
        this.object = object;
        this.parameter = parameter;
    }
}

// UIを作るクラス
export class CreatorForUI {
    constructor() {
        this.groupID = createID();
        this.dom = null;
        this.lists = new Map();

        this.globalInputObject = {};

        this.domKeeper = new Map();
    }

    setUpdateEventToParameter(searchTarget, path, event, flag) {
        const template = flag ? {g: this.groupID, f: flag} : {g: this.groupID};
        try {
            // pathをもとに参照
            if (path[0] == "/") {
                path = path.slice(1);
            } else {
                searchTarget = this.globalInputObject;
            }
            if (path == "") {
                managerForDOMs.set(Object.assign(template,{o: searchTarget}), null, event);
            }
            const pathRoot = path.split("/");
            const root = pathRoot.slice(0, -1);
            let lastRoot = pathRoot[pathRoot.length - 1];
            let lastIsParameter = false;
            if (lastRoot[0] == "%") { // ~/%parameterNameの場合オブジェクト内のidを対象とする
                lastRoot = lastRoot.slice(1);
                lastIsParameter = true;
            }
            let object = searchTarget;
            for (const next of root) {
                if (next in object) {
                    object = object[next];
                } else {
                    return null;
                }
            }
            if (lastIsParameter) {
                managerForDOMs.set(Object.assign(template,{o: object, i: lastRoot}), null, event);
            } else {
                const final = object[lastRoot];
                if (isPassByReference(final)) {
                    managerForDOMs.set(Object.assign(template,{o: final}), null, event);
                } else {
                    managerForDOMs.set(Object.assign(template,{o: object, i: lastRoot}), null, event);
                }
            }
        } catch {
            console.trace("値の取得", path, searchTarget, "でエラーが出ました");
        }
    }

    getParameter(searchTarget, path, option = 0) {
        try {
            // pathをもとに参照
            if (path[0] == "/") {
                path = path.slice(1);
            } else {
                searchTarget = this.globalInputObject;
            }
            if (path == "") {
                return searchTarget;
            }
            const pathRoot = path.split("/");
            const root = pathRoot.slice(0, -1);
            const lastRoot = pathRoot[pathRoot.length - 1];
            let object = searchTarget;
            for (const next of root) {
                if (next in object) {
                    object = object[next];
                } else {
                    return null;
                }
            }
            const final = object[lastRoot];
            if (option == 1) {
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
        } catch {
            console.trace("値の取得", path, searchTarget, "でエラーが出ました");
        }
    }

    // パスからオブジェクトの参照を見つける
    findSource(path, searchTarget) {
        try {
            if (path == "") {
                return searchTarget;
            } else {
                // pathをもとに参照
                const pathRoot = path.split("/");
                let object = searchTarget;
                for (const next of pathRoot) {
                    if (next in object) {
                        object = object[next];
                    } else {
                        return null;
                    }
                }
                return object;
            }
        } catch {
            console.warn(path, searchTarget, "でエラーが出ました");
        }
    }

    createListWith(/** @type {HTMLElement} */htmlList, withObjects, searchObject, flag) {
        if (isPlainObject(withObjects)) {
            const list = this.getParameter(searchObject, withObjects);
            if (!list) {
                console.warn("配列が見つかりません", withObjects, searchObject);
            }
            if (customIndex) {
                htmlList.forEach((tag,index) => {
                    this.setWith(tag, `/${customIndex[index]}`, list, flag);
                })
            } else {
                htmlList.forEach((tag,index) => {
                    this.setWith(tag, `/${index}`, list, flag);
                })
            }
        }
    }

    // オブジェクトのパラメータと値を関連付ける
    setWith(/** @type {HTMLElement} */t, withObject, searchTarget, flag) {
        if (isPlainObject(withObject)) {
            console.warn("構文が古いです", withObject);
            console.trace();
        } else {
            let source = this.getParameter(searchTarget, withObject, 1);
            if (!source) { // 取得できなかったら切り上げ
                console.warn("UIとパラメータの連携ができませんでした", withObject, searchTarget);
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
                    t.checked = source.object[source.parameter];
                };
            } else if (t.type == "range") {
                updateDOMsValue = () => {
                    t.value = source.object[source.parameter];
                    updateRangeStyle(t);
                };
            } else if (t.type == "color") {
                updateDOMsValue = () => {
                    t.value = rgbToHex(...source.object[source.parameter]);
                };
            } else {
                updateDOMsValue = () => {
                    if (!isFocus(t)) {
                        t.value = source.object[source.parameter];
                    }
                };
            }
            updateDOMsValue();
            this.setUpdateEventToParameter(searchTarget, withObject, updateDOMsValue, flag);
            let command;
            // イベントを作成
            // t.addEventListener("change", () => {
            t.addEventListener("input", () => {
                let newValue;
                if (t.type == "number" || t.type == "range") { // 数字型
                    newValue = Number(t.value);
                } else if (t.type == "checkbox") {
                    newValue = t.checked;
                } else if (t.type == "color") {
                    const valueColor = hexToRgba(t.value, 1);
                    newValue = valueColor;
                } else if (t.tagName === "SELECT") {
                    newValue = t.value;
                } else {
                    newValue = t.value;
                }
                if (command) {
                    command.update(newValue);
                } else {
                    command = new ChangeParameterCommand(source.object, source.parameter, newValue);
                }
            });
            t.addEventListener("change", () => {
                app.operator.appendCommand(command);
                app.operator.execute();
                command = null;
            })
        }
    }

    createListChildren(t, liStruct, withObject, searchTarget, options, flag) {
        if (!("li" in options)) options.li = true;
        let result = {active: null, selects: []};
        let getSelectsDataFunction = null;
        if (options.selectSource) {
            if (options.selectSource.function) {
                result.selects = options.selectSource.function;
                getSelectsDataFunction = options.selectSource.getFunction;
            } else {
                result.selects = this.findSource(options.selectSource.object, this.globalInputObject);
                console.log(options.selectSource.object, this.globalInputObject)
            }
        }
        let activeSource = null;
        let getActiveDataFunction = null;
        if (options.activeSource) {
            if (options.activeSource.function) {
                activeSource = options.activeSource.function;
                getActiveDataFunction = options.activeSource.getFunction;
            } else {
                activeSource = {object: this.findSource(options.activeSource.object, this.globalInputObject), parameter: options.activeSource.parameter};
            }
        } else {
            activeSource = {object: result, parameter: "active"};
        }
        let list = this.getParameter(searchTarget, withObject);
        console.log("リスト", withObject.object, searchTarget, list)
        const listID = createID();
        let lastUpdateObjects = [];
        if (Array.isArray(list)) {
            // 内容の更新
            const listUpdate = (o, gID, dom) => {
                // 消された要素を削除
                for (const object of lastUpdateObjects) {
                    if (!list.includes(object)) {
                        managerForDOMs.deleteDOM(object, this.groupID, listID);
                    }
                }
                for (const object of list) {
                    if (!lastUpdateObjects.includes(object)) { // ない場合新規作成
                        const li = document.createElement("div");
                        li.style.minHeight = "fit-content";
                        li.style.height = "fit-content";
                        t.append(li);
                        li.addEventListener("click", () => {
                            if (isFunction(activeSource)) { // 関数の場合
                                activeSource(list.indexOf(object),object);
                            } else {
                                activeSource.object[activeSource.parameter] = object;
                                result.active = object;
                                if (isFunction(result.selects)) {
                                    result.selects(list.indexOf(object),object);
                                } else {
                                    if (!app.input.keysDown["Shift"]) {
                                        result.selects.length = 0;
                                    }
                                    result.selects.push(object);
                                }
                                console.log(result,activeSource);
                            }
                            managerForDOMs.update(list, listID + "選択情報");
                        });
                        this.createFromChildren(li, liStruct, object, flag); // 子要素に伝播
                        managerForDOMs.set({o: object, g: this.groupID, i: listID, f: flag}, li, null, null); // セット
                    }
                }
                lastUpdateObjects = [...list];
            }

            // 選択表示の更新
            const listActive = (o, gID, t) => {
                console.log("アクティブ")
                const createdTags = managerForDOMs.getGroupAndID(this.groupID, listID); // すでに作っている場合
                createdTags.forEach((data, object) => {
                    let bool_ = false;
                    if (getActiveDataFunction) {
                        bool_ = getActiveDataFunction(object);
                    } else {
                        bool_ = activeSource.object[activeSource.parameter] == object;
                    }
                    if (bool_) {
                        data.dom.classList.add("activeColor");
                    } else {
                        data.dom.classList.remove("activeColor");
                        let bool__ = false;
                        if (getSelectsDataFunction) {
                            getSelectsDataFunction(object);
                        } else {
                            bool__ = result.selects.includes(object);
                        }
                        if (bool__) {
                            data.dom.classList.add("activeColor2");
                        } else {
                            data.dom.classList.remove("activeColor2");
                        }
                    }
                })
            }
            managerForDOMs.set({o: list, g: this.groupID, i: "_All" + listID, f: flag}, t, listUpdate, null);
            managerForDOMs.set({o: list, g: this.groupID, i: listID + "選択情報", f: flag}, t, listActive, null);
            managerForDOMs.update(list, "_All" + listID);
        } else if (isPlainObject(list)) {
        }
        return result;
    }

    // 構造の配列をもとにDOMの構築
    createFromChildren(/** @type {HTMLElement} */t, struct, searchTarget, flag = "defo", getChildren = false) {
        // const myChildrenTag = [...childrenTag];
        const myChildrenTag = [];
        for (const child of struct) {
            /** @type {HTMLElement} */
            let element;
            // 要素の作成
            element = tagCreater[child.type](this, t, searchTarget, child, flag);
            if (element) {
                if (child.style) {
                    setStyle(element, child.style);
                }
                if (child.class) {
                    setClass(element, child.class);
                }
                if (child.event) {
                    for (const eventName in child.event) {
                        element.addEventListener(eventName, () => {
                            child.event[eventName](searchTarget, element);
                        })
                    }
                }
                if (child.id) {
                    this.domKeeper.set(child.id, element);
                }
                if (child.label) {
                    if (element instanceof HTMLElement) {
                        element = setLabel(t, child.label, element);
                    }
                }
                if (getChildren) {
                    if (Array.isArray(element)) {
                        myChildrenTag.push(...element);
                    } else if (element) {
                        myChildrenTag.push(element);
                    }
                }
            }
        }
        return myChildrenTag;
    }

    create(/** @type {HTMLElement} */target, struct, options = {heightCN: false, padding: true}) {
        this.remove();
        this.dom = target;
        const domStruct = struct.DOM;
        const inputObject = struct.inputObject;
        this.globalInputObject = inputObject;

        const t = createTag(target, "div");

        if (options?.heightCN) {
            t.classList.add("ui_container_1");
        } else if (options?.padding) {
            t.classList.add("ui_container_0");
        } else {
            t.style.height = "100%";
            t.style.width = "100%";
        }

        this.createFromChildren(t,domStruct,inputObject);
    }

    shelfeCreate(/** @type {HTMLElement} */target, struct) {
        this.remove();
        this.dom = target;
        const domStruct = struct.DOM;
        const inputObject = struct.inputObject;
        this.globalInputObject = inputObject;

        this.createFromChildren(target,domStruct,inputObject);
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
        managerForDOMs.deleteGroup(this.groupID);
    }
}

export class Shelfe {
    constructor() {
        this.submitData = {};
    }
}