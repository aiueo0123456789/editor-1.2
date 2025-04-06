import { keysDown } from "../main.js";
import { isFunction, isPlainObject } from "../utility.js";
import { hierarchy } from "../ヒエラルキー.js";
import { createLabeledInputNumber } from "./utility.js";
import { createDoubleClickInput, createIcon, createID, createLabeledInput, createLabeledSelect, createMinList, createSection, createTag, managerForDOMs } from "./制御.js";

function updateValue(object, groupID, t, others) {
    t.value = object[others.parameter];
}

function createLooper(/** @type {HTMLElement} */t, target, searchTarget) {
}

export class CreatorForUI {
    constructor() {
        this.groupID = createID();
        this.lists = new Map();
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

    // オブジェクトのパラメータと値を関連付ける
    createWith(/** @type {HTMLElement} */t, withObject, searchTarget) {
        if (isPlainObject(withObject)) {
            if ("object" in withObject && "parameter" in withObject) {
                let object = this.findSource(withObject.object, searchTarget);
                if (!object) { // 取得できなかったら切り上げ
                    console.warn("UIとパラメータの連携ができませんでした", withObject, searchTarget)
                    return ;
                }
                // 値をセット
                t.value = object[withObject.parameter];
                // 値を関連づけ
                managerForDOMs.set(object, this.groupID, t, updateValue, {parameter: withObject.parameter}, withObject.parameter);
                // イベントを作成
                t.addEventListener("change", () => {
                    if (t.type == "number") {
                        object[withObject.parameter] = Number(t.value);
                    } else {
                        object[withObject.parameter] = t.value;
                    }
                    managerForDOMs.update(object,withObject.parameter);
                });
            }
        }
    }

    createListChildren(t, liStruct, withObject, searchTarget, option) {
        let active = null;
        let selects = [];
        let list = this.findSource(withObject.object, searchTarget);
        const listID = createID();
        if (Array.isArray(list)) {
            const listUpdate = (o, gID, t) => {
                const createdTags = managerForDOMs.getGroupAndID(this.groupID, listID); // すでに作っている場合
                for (const object of createdTags.keys()) {
                    if (!list.includes(object)) {
                        managerForDOMs.delete(object, this.groupID, listID);
                        createdTags.delete(object);
                    }
                }
                for (const object of list) {
                    // let li = managerForDOMs.getDOMInObject(object, this.groupID, listID);
                    let li = createdTags.get(object);
                    if (!li) {
                        const li = document.createElement("li");
                        li.addEventListener("click", () => {
                            active = object;
                            if (!keysDown["Shift"]) {
                                selects.length = 0;
                            }
                            selects.push(object);
                            managerForDOMs.update(list, "選択情報");
                        });
                        t.append(li);
                        this.createFromChildren(li, liStruct, object);
                        managerForDOMs.set(object, this.groupID, li, null, null, listID);
                    }
                }
            }
            const listActive = (o, gID, t) => {
                const createdTags = managerForDOMs.getGroupAndID(this.groupID, listID); // すでに作っている場合
                createdTags.forEach((data, object) => {
                    const bool_ = active == object;
                    if (bool_) {
                        data[0].classList.add("activeColor");
                    } else {
                        data[0].classList.remove("activeColor");
                        const bool__ = selects.includes(object);
                        if (bool__) {
                            data[0].classList.add("activeColor2");
                        } else {
                            data[0].classList.remove("activeColor2");
                        }
                    }
                })
            }
            managerForDOMs.set(list, this.groupID, t, listUpdate);
            managerForDOMs.set(list, this.groupID, t, listActive, null, "選択情報");
            managerForDOMs.update(list);
        } else if (isPlainObject(list)) {
        }
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
            } else if (child.type == "input") {
                if (child.label) {
                    element = createLabeledInputNumber(t, child.name, child.name);
                } else {
                    element = createTag(t, "input", {type: "number"});
                }
                this.createWith(element, child.withObject, searchTarget);
            } else if (child.type == "select") {
                element = createLabeledSelect(t, child.name, child.name);
                const option = createTag(element, "option", {value: "", textContent: "なし", selected: true});
            } else if (child.type == "dbInput") {
                element = createDoubleClickInput();
                t.append(element);
                this.createWith(element, child.withObject, searchTarget);
            } else if (child.type == "list") {
                if (child.option == "min") {
                    element = createMinList(t,child.name);
                    if (child.appendEvent) {
                        if (isFunction(child.appendEvent)) {
                            element.appendButton.addEventListener("click", child.appendEvent);
                        }
                    } else {
                        element.appendButton.classList.add("color2");
                        element.appendButton.style.pointerEvents = "none";
                    }
                    if (child.deleteEvent) {
                        element.deleteButton.addEventListener("click", () => {
                        });
                    } else {
                        element.deleteButton.classList.add("color2");
                        element.deleteButton.style.pointerEvents = "none";
                    }
                    this.createListChildren(element.list, child.liStruct, child.withObject, searchTarget);
                } else if (child.option == "noScroll") {
                    element = createTag(t, "ul");
                    this.createListChildren(element, child.liStruct, child.withObject, searchTarget);
                } else {
                    element = createTag(t, "ul", {class: "scrollable"});
                    this.createListChildren(element, child.liStruct, child.withObject, searchTarget);
                }
            } else if (child.type == "container") {
                element = createTag(t, "ul");
                if (child.children) {
                    this.createFromChildren(element, child.children, searchTarget);
                }
            } else if (child.type == "section") {
                const div = document.createElement("div");
                div.classList.add("section");
                element = createSection(t,child.name,div);
                if (child.children) {
                    this.createFromChildren(div, child.children, searchTarget);
                }
            } else if (child.type == "icon-img") {
                element = createIcon(t, this.findSource(child.withObject.object, searchTarget)[child.withObject.parameter]);
            } else if (child.type == "looper") {
            }
            if (child.style) {
                child.style.replace(/\s+/g, ""); // 半角・全角スペースを削除
                const styles = child.style.split(";").filter(Boolean);
                for (const style of styles) {
                    if (style == "flex") {
                        element.classList.add("flex");
                    } else {
                        const options = style.split(":");
                        if (options[0] == "p-l") {
                            element.style.paddingLeft = options[1];
                        } else {
                            console.warn("登録されていないスタイルです",style);
                        }
                    }
                }
            }
        }
    }

    create(/** @type {HTMLElement} */target, struct, inputObject) {
        let objectTable = {};
        if (inputObject) {
            objectTable = inputObject;
        } else {
            for (const keyName in struct.inputObject) {
                let object;
                if (struct.inputObject[keyName] == "hierarchy") {
                    object = hierarchy;
                }
                objectTable[keyName] = object;
            }
        }

        console.log(struct);
        target.replaceChildren();
        target.className = "";
        target.classList.add("scrollable","color2");

        this.createFromChildren(target,struct.DOM,objectTable);
    }

    delete() {
        managerForDOMs.deleteGroup(this.groupID);
    }
}

// export function createUI(/** @type {HTMLElement} */target, struct, inputObject) {
//     let objectTable = {};
//     if (inputObject) {
//         objectTable = inputObject;
//     } else {
//         for (const keyName in struct.inputObject) {
//             let object;
//             if (struct.inputObject[keyName] == "hierarchy") {
//                 object = hierarchy;
//             }
//             objectTable[keyName] = object;
//         }
//     }

//     console.log(struct);
//     target.replaceChildren();
//     target.className = "";
//     target.classList.add("scrollable","color2");

//     this.createFromChildren(target,struct.DOM,objectTable);
// }

// export function deleteUI() {

// }