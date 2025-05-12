import { app } from "../../app.js";
import { keysDown } from "../../main.js";
import { isFunction, isPlainObject } from "../../utility.js";
import { createButton, createChecks, createDoubleClickInput, createGroupButton, createIcon, createID, createLabeledInput, createLabeledSelect, createMinList, createRadios, createRange, createSection, createTag, managerForDOMs, setLabel, updateRangeStyle } from "../../UI/制御.js";

const virtuality = document.getElementById("virtuality");

// パラメーターの変動を関連付けられたhtml要素に適応する関数
function updateDOMsValue(object, groupID, DOMs, others) {
    for (const DOM of DOMs) {
        if (DOM.type == "checkbox") {
            DOM.checked = object[others.parameter];
        } else {
            DOM.value = object[others.parameter];
        }
        if (DOM.type == "range") {
            updateRangeStyle(DOM);
        } else if (DOM.tagName === "SELECT") {
            updateLookForSelect(DOM);
        }
    }
}

function updateLookForSelect(t) {
    const imgText = document.createElement("p");
    virtuality.append(imgText)
    imgText.classList.add("imgText");
    imgText.textContent = t.value;
    t.style.width = `${imgText.offsetWidth}px`;
    imgText.remove();
}

function createCheckbox(target, type = "custom-checkbox", text = "") {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    const label = document.createElement("label");
    label.classList.add("box");
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
    target.append(label);
    return checkbox;
}

// UIを作るクラス
export class CreatorForUI {
    constructor() {
        this.groupID = createID();
        this.lists = new Map();

        this.root = {};

        this.domKeeper = new Map();
    }

    createHierarchy(t, withObject, loopTarget, structures, searchTarget) {
        const scrollable = createTag(t, "div", {class: "scrollable"});
        scrollable.style.height = "200px";
        const sourceObject = this.findSource(withObject.object, searchTarget);
        const getAllObject = () => {
            const getLoopChildren = (children, result = []) => {
                for (const child of children) {
                    result.push(child);
                    const nextChildren = this.findSource(loopTarget, child);
                    if (nextChildren) { // 子要素がある場合ループする
                        getLoopChildren(nextChildren, result);
                    }
                }
                return result;
            }
            return getLoopChildren(sourceObject);
        }
        const hierarchyUpdate = (o, gID, t) => {
            const allObject = getAllObject();
            for (const object of allObject) {
                const objectDOM = managerForDOMs.getDOMInObjectAndGroupID(object, this.groupID)
                if (!objectDOM) { // タグが存在しない場合新規作成
                    const container = createTag(null, "div");
                    /** @type {HTMLElement} */
                    const myContainer = createTag(container, "div");
                    myContainer.addEventListener("mousedown", () => {
                        app.scene.state.setActiveObject(object);
                    })
                    const childrenContainer = createTag(container, "div");
                    this.createFromChildren(myContainer, structures, object);
                    childrenContainer.style.marginLeft = "10px"
                    managerForDOMs.set(object, this.groupID, {container, myContainer, childrenContainer}, null);
                }
            }
            const looper = (children,targetDOM = scrollable) => {
                for (const child of children) {
                    const managerObject = managerForDOMs.getDOMInObjectAndGroupID(child, this.groupID);
                    targetDOM.append(managerObject.container);
                    const nextChildren = this.findSource(loopTarget, child);
                    if (nextChildren) { // 子要素がある場合ループする
                        looper(nextChildren, managerObject.childrenContainer);
                    }
                }
            }
            looper(sourceObject);
        }
        managerForDOMs.set(sourceObject, this.groupID, scrollable, hierarchyUpdate);
        managerForDOMs.updateGroupInObject(sourceObject, this.groupID);
    }

    // パスからオブジェクトの参照を見つける
    findSource(path, searchTarget) {
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
    }

    createListWith(/** @type {HTMLElement} */htmlList, target, searchObject) {
        if (isPlainObject(target)) {
            const list = this.findSource(target.object, searchObject);
            if (!list) {
                console.trace();
                console.warn("配列が見つかりません", target, searchObject);
            }
            if (target.customIndex) {
                htmlList.forEach((tag,index) => {
                    this.createWith(tag, {object: "", parameter: target.customIndex[index]}, list);

                })
            } else {
                htmlList.forEach((tag,index) => {
                    this.createWith(tag, {object: "", parameter: index}, list);
                })
            }
        }
    }

    // オブジェクトのパラメータと値を関連付ける
    createWith(/** @type {HTMLElement} */t, withObject, searchTarget) {
        if (isPlainObject(withObject)) {
            if ("object" in withObject && "parameter" in withObject) {
                let object = this.findSource(withObject.object, searchTarget);
                if (!object) { // 取得できなかったら切り上げ
                    console.warn("UIとパラメータの連携ができませんでした", withObject, searchTarget);
                    if (t.type == "number" || t.type == "range") { // 数字型
                        t.value = 0.5;
                    } else {
                        t.value = "エラー";
                    }
                    return ;
                }
                // 値をセット
                if (t.type == "checkbox") {
                    t.checked = object[withObject.parameter];
                } else {
                    t.value = object[withObject.parameter];
                }
                // 値を関連づけ
                const existDOMs = managerForDOMs.getDOMInObjectAndGroupID(object, this.groupID, withObject.parameter);
                if (existDOMs) { // すでに存在している場合は追加
                    existDOMs.push(t);
                } else {
                    managerForDOMs.set(object, this.groupID, [t], updateDOMsValue, {parameter: withObject.parameter}, withObject.parameter);
                }
                // イベントを作成
                // t.addEventListener("change", () => {
                t.addEventListener("input", () => {
                    if (t.type == "number" || t.type == "range") { // 数字型
                        object[withObject.parameter] = Number(t.value);
                    } else if (t.type == "checkbox") {
                        object[withObject.parameter] = t.checked;
                    } else if (t.tagName === "SELECT") {
                        object[withObject.parameter] = t.value;
                    } else {
                        object[withObject.parameter] = t.value;
                    }
                    managerForDOMs.update(object,withObject.parameter);
                });
            }
        }
    }

    createListChildren(t, liStruct, withObject, searchTarget, options) {
        if (!("li" in options)) options.li = true;
        let result = {active: null, selects: []};
        let activeSource = null;
        if (isPlainObject(options.select)) {
            result.selects = this.findSource(options.select.sourceSelect.object, this.root);
            activeSource = {object: this.findSource(options.select.sourceActive.object, this.root), parameter: options.select.sourceActive.parameter};
        } else {
            activeSource = {object: result, parameter: "active"};
        }
        let list = this.findSource(withObject.object, searchTarget);
        const listID = createID();
        if (Array.isArray(list)) {
            // 内容の更新
            const listUpdate = (o, gID, t) => {
                const createdTags = managerForDOMs.getGroupAndID(this.groupID, listID); // すでに作っている場合
                for (const object of createdTags.keys()) {
                    if (!list.includes(object)) {
                        managerForDOMs.deleteDOM(object, this.groupID, listID);
                        createdTags.delete(object);
                    }
                }
                for (const object of list) {
                    // let li = managerForDOMs.getDOMInObject(object, this.groupID, listID);
                    let li = createdTags.get(object); // 存在確認
                    if (!li) { // ない場合新規作成
                        li = document.createElement("li");
                        t.append(li);
                        if (options.select) {
                            li.addEventListener("click", () => {
                                activeSource.object[activeSource.parameter] = object;
                                result.active = object;
                                if (!keysDown["Shift"]) {
                                    result.selects.length = 0;
                                }
                                result.selects.push(object);
                                console.log(result,activeSource);
                                managerForDOMs.update(list, "選択情報");
                            });
                        }
                        this.createFromChildren(li, liStruct, object); // 子要素に伝播
                        managerForDOMs.set(object, this.groupID, li, null, null, listID); // セット
                    }
                }
            }

            // 選択表示の更新
            const listActive = (o, gID, t) => {
                const createdTags = managerForDOMs.getGroupAndID(this.groupID, listID); // すでに作っている場合
                createdTags.forEach((data, object) => {
                    // console.log(object, activeSource.object[activeSource.parameter]);
                    const bool_ = activeSource.object[activeSource.parameter] == object;
                    if (bool_) {
                        data[0].classList.add("activeColor");
                    } else {
                        data[0].classList.remove("activeColor");
                        const bool__ = result.selects.includes(object);
                        if (bool__) {
                            data[0].classList.add("activeColor2");
                        } else {
                            data[0].classList.remove("activeColor2");
                        }
                    }
                })
            }
            managerForDOMs.set(list, this.groupID, t, listUpdate, null, listID + "-^¥");
            if (options.select) {
                managerForDOMs.set(list, this.groupID, t, listActive, null, "選択情報");
            }
            managerForDOMs.update(list, listID);
        } else if (isPlainObject(list)) {
        }
        return result;
        // this.lists.set("");
    }

    // 構造の配列をもとにDOMの構築
    createFromChildren(/** @type {HTMLElement} */t, children, searchTarget) {
        for (const child of children) {
            /** @type {HTMLElement} */
            let element;
            // 要素の作成
            if (child.type == "div") {
                element = createTag(t, "div");
                if (child.children) {
                    this.createFromChildren(element, child.children, searchTarget);
                }
            } else if (child.type == "input") { // 入力
                if (!child.options) return ;
                if (child.options.type == "text") {
                    if (child.label) {
                        element = createLabeledInput(t, child.label, child.options.type, child.name);
                    } else {
                        element = createTag(t, "input", child.options);
                    }
                    this.createWith(element, child.withObject, searchTarget);
                } else if (child.options.type == "check") {
                    const checkbox = createCheckbox(t, child.options.look);
                    this.createWith(checkbox, child.withObject, searchTarget);
                } else { // 数字型
                    if (child.label) {
                        element = document.createElement("div");
                        setLabel(t, child.label, element);
                    } else {
                        element = createTag(t, "div");
                    }
                    element.style.width = "100%";
                    element.style.display = "grid";
                    element.style.gridTemplateColumns = "1fr 50px";
                    /** @type {HTMLElement} */
                    const range = createRange(element, child.options);
                    range.style.gridColumn = "1/2";
                    range.style.borderTopRightRadius = "0px";
                    range.style.borderBottomRightRadius = "0px";
                    this.createWith(range, child.withObject, searchTarget);
                    /** @type {HTMLElement} */
                    const number = createTag(element, "input", child.options);
                    number.style.gridColumn = "2/3";
                    number.style.borderTopLeftRadius = "0px";
                    number.style.borderBottomLeftRadius = "0px";
                    this.createWith(number, child.withObject, searchTarget);
                }
            } else if (child.type == "button") {
                createButton(t, "グループ", child.label);
            } else if (child.type == "buttons") {
                createGroupButton(t, [{icon: "グループ", label: "a"},{icon: "グループ", label: "b"},{icon: "グループ", label: "c"}]);
            } else if (child.type == "radios") {
                createRadios(t, [{icon: "グループ", label: "a"},{icon: "グループ", label: "b"},{icon: "グループ", label: "c"}]);
            } else if (child.type == "checks") {
                const a = (child.withObject.customIndex).map((parameterName, index) => {
                    return {icon: "グループ", label: parameterName};
                });
                const result = createChecks(t, a);
                element = result.html;
                this.createListWith(result.checkList, child.withObject, searchTarget);
            } else if (child.type == "select") {
                element = createLabeledSelect(t, child.label, child.name);
                if (child.sourceObject) { // 関連付け
                    const sourceObject = this.findSource(child.sourceObject.object, searchTarget);
                    console.log(sourceObject)
                    if (Array.isArray(sourceObject[child.sourceObject.parameter])) { // 配列から静的生成
                        element.replaceChildren();
                        sourceObject[child.sourceObject.parameter].forEach((value, index) => {
                            const option = createTag(element, "option", {value: value, textContent: value, selected: false});
                        })
                    } else { // 関数で動的動的生成
                        const option = createTag(element, "option", {value: "", textContent: "なし", selected: true});
                        element.addEventListener("mousedown", () => { // 開く直前に内容を更新
                            element.replaceChildren();
                            for (let i = 0; i < 10; i ++) {
                                const option = createTag(element, "option", {value: "", textContent: createID(), selected: false});
                            }
                        })
                    }
                }
                this.createWith(element, child.writeObject, searchTarget);
            } else if (child.type == "dbInput") { // ダブルクッリク入力
                element = createDoubleClickInput();
                t.append(element);
                this.createWith(element, child.withObject, searchTarget);
            } else if (child.type == "list") {
                if (child.options.type == "min") {
                    element = createMinList(t,child.name);
                    const listOutputData = this.createListChildren(element.list, child.liStruct, child.withObject, searchTarget, child.options);
                    if (child.appendEvent) {
                        if (isFunction(child.appendEvent.function)) {
                            element.appendButton.addEventListener("click", child.appendEvent.function);
                        }
                    } else {
                        element.appendButton.classList.add("color2");
                        element.appendButton.style.pointerEvents = "none";
                    }
                    if (child.deleteEvent) {
                        if (isFunction(child.deleteEvent.function)) {
                            element.deleteButton.addEventListener("click", child.deleteEvent.function.bind(null, listOutputData[child.deleteEvent.submitData[0]]));
                        }
                    } else {
                        element.deleteButton.classList.add("color2");
                        element.deleteButton.style.pointerEvents = "none";
                    }
                } else if (child.options.type == "noScroll") {
                    element = createTag(t, "ul");
                    this.createListChildren(element, child.liStruct, child.withObject, searchTarget, child.options);
                } else if (child.options.type == "row") {
                    element = createTag(t, "ul", {class: "flexRow"});
                    this.createListChildren(element, child.liStruct, child.withObject, searchTarget, child.options);
                } else {
                    element = createTag(t, "ul", {class: "scrollable"});
                    this.createListChildren(element, child.liStruct, child.withObject, searchTarget, child.options);
                }
            } else if (child.type == "container") {
                element = createTag(t, "ul");
                if (child.children) {
                    this.createFromChildren(element, child.children, searchTarget);
                }
            } else if (child.type == "section") {
                const div = document.createElement("div");
                div.classList.add("section-main");
                element = createSection(t,child.name,div);
                if (child.children) {
                    this.createFromChildren(div, child.children, searchTarget);
                }
            } else if (child.type == "option") {
                element = createTag(t, "div", {class: "ui_options"});
                if (child.children) {
                    this.createFromChildren(element, child.children, searchTarget);
                }
            } else if (child.type == "icon-img") {
                element = createIcon(t, this.findSource(child.withObject.object, searchTarget)[child.withObject.parameter]);
            } else if (child.type == "looper") {
            } else if (child.type == "flexBox") {
                element = createTag(t, "div");
                element.style.display = "flex";
                element.style.gap = child.interval;
                if (child.children) {
                    this.createFromChildren(element, child.children, searchTarget);
                }
            } else if (child.type == "gridBox") {
                element = createTag(t, "div");
                element.style.display = "grid";
                if (child.axis == "r") {
                    element.style.gridTemplateRows = child.allocation;
                } else {
                    element.style.gridTemplateColumns = child.allocation;
                }
                if (child.children) {
                    this.createFromChildren(element, child.children, searchTarget);
                }
            } else if (child.type == "padding") {
                element = createTag(t, "div");
                element.style.width = child.size;
            } else if (child.type == "separator") {
                element = createTag(t, "span");
                element.classList.add("separator");
                element.style.width = child.size;
            } else if (child.type == "hierarchy") {
                this.createHierarchy(t, child.withObject, child.loopTarget, child.structures, searchTarget);
            } else if (child.type == "scrollable") {
                element = createTag(t, "div", {class: "scrollable"});
                if (child.children) {
                    this.createFromChildren(element, child.children, searchTarget);
                }
            } else if (child.type == "box") {
                element = createTag(t, "div");
                if (child.children) {
                    this.createFromChildren(element, child.children, searchTarget);
                }
            } else if (child.type == "canvas") {
                element = createTag(t, "canvas");
            }
            if (child.style) {
                child.style = child.style.replace(/\s+/g, ""); // 半角・全角スペースを削除
                const styles = child.style.split(";").filter(Boolean); // ;で区切る
                for (const style of styles) {
                    const code = style.split(":");
                    element.style[code[0]] = code[1];
                    // if (style == "flex") {
                    // } else {
                    //     const options = style.split(":");
                    //     if (options[0] == "p-l") {
                    //         element.style.paddingLeft = options[1];
                    //     } else {
                    //         console.warn("登録されていないスタイルです",style);
                    //     }
                    // }
                }
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
        }
    }

    create(/** @type {HTMLElement} */target, object, options = {heightCN: false}) {
        const struct = object.struct;
        const inputObject = object.inputObject;
        this.root = inputObject;

        console.log(struct);
        target.replaceChildren();
        target.className = "";
        if (options.heightCN) {
            target.classList.add("ui_container_1");
        } else {
            target.classList.add("ui_container_0");
        }

        this.createFromChildren(target,struct.DOM,inputObject);
    }

    getDOMFromID(id) {
        return this.domKeeper.get(id);
    }

    delete() {
        managerForDOMs.deleteGroup(this.groupID);
    }
}

export class Shelfe {
    constructor() {
        this.submitData = {};
    }
}