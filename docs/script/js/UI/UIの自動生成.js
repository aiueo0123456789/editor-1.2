import { isPlainObject } from "../utility.js";
import { hierarchy } from "../ヒエラルキー.js";
import { createLabeledInputNumber } from "./utility.js";
import { createDoubleClickInput, createIcon, createLabeledInput, createLabeledSelect, createMinList, createSection, managerForDOMs } from "./制御.js";

function updateValue(object, groupID, t, others) {
    t.value = object[others.parameter];
}

// パスからオブジェクトの参照を見つける
function findSource(path, searchTarget) {
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
function createWith(/** @type {HTMLElement} */t, withObject, searchTarget) {
    if (isPlainObject(withObject)) {
        if ("object" in withObject && "parameter" in withObject) {
            let object = findSource(withObject.object, searchTarget);
            if (!object) { // 取得できなかったら切り上げ
                console.warn("UIとパラメータの連携ができませんでした", withObject, searchTarget)
                return ;
            }
            // 値をセット
            t.value = object[withObject.parameter];
            // 値を関連づけ
            managerForDOMs.set(object, Math.round(Math.random() * 200), t, updateValue, {parameter: withObject.parameter}, withObject.parameter);
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

function createListChildren(t, liStruct, withObject, searchTarget) {
    let list = findSource(withObject.object, searchTarget);
    if (Array.isArray(list)) {
        for (const object of list) {
            const li = document.createElement("li");
            t.append(li);
            createFromChildren(li, liStruct, object);
        }
    } else if (isPlainObject(list)) {
        // for (const object of list) {
        //     const li = document.createElement("li");
        //     t.append(li);
        //     createFromChildren(li, liStruct, object);
        // }
    }
}

// 構造の配列をDOMに追加
function createFromChildren(/** @type {HTMLElement} */t, children, searchTarget) {
    for (const child of children) {
        /** @type {HTMLElement} */
        let element;
        // 要素の作成
        if (child.type == "div") {
            element = document.createElement("div");
            t.append(element);
            if (child.children) {
                createFromChildren(element, child.children, searchTarget);
            }
        } else if (child.type == "input") {
            element = createLabeledInputNumber(t, child.name, child.name);
            createWith(element, child.withObject, searchTarget);
        } else if (child.type == "select") {
            element = createLabeledSelect(t, child.name, child.name);
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "なし";
            option.selected = true;
            element.append(option);
        } else if (child.type == "dbInput") {
            element = createDoubleClickInput();
            t.append(element);
            createWith(element, child.withObject, searchTarget);
        } else if (child.type == "list") {
            element = createMinList(t,child.name);
            createListChildren(element.list, child.liStruct, child.withObject, searchTarget);
        } else if (child.type == "container") {
            element = document.createElement("ul");
            t.append(element);
            createListChildren(element, child.liStruct, child.withObject, searchTarget);
        } else if (child.type == "section") {
            const div = document.createElement("div");
            div.classList.add("section");
            element = createSection(t,child.name,div);
            if (child.children) {
                createFromChildren(div, child.children, searchTarget);
            }
        } else if (child.type == "icon-img") {
            element = createIcon(t, findSource(child.withObject.object, searchTarget)[child.withObject.parameter]);
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

export function UI_createFromJSON(/** @type {HTMLElement} */target, struct) {
    const objectTable = {};
    for (const keyName in struct.inputObject) {
        let object;
        if (struct.inputObject[keyName] == "hierarchy") {
            object = hierarchy;
        }
        objectTable[keyName] = object;
    }

    console.log(struct);
    target.replaceChildren();
    target.className = "";
    target.classList.add("scrollable","color2");

    createFromChildren(target,struct.DOM,objectTable);
}