import { isPlainObject } from "../utility.js";
import { hierarchy } from "../ヒエラルキー.js";
import { createLabeledInputNumber } from "./utility.js";
import { createLabeledInput, createLabeledSelect, createMinList, createSection, managerForDOMs } from "./制御.js";

function updateValue(object, groupID, t, others) {
    t.value = object[others.parameter];
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

    // 補助関数
    // パスからオブジェクトの参照を見つける
    const findSource = (path, searchTarget = objectTable) => {
        // pathをもとに参照
        const pathRoot = path.split("/");
        let object = undefined;
        for (const next of pathRoot) {
            if (object) {
                object = object[next];
            } else {
                object = searchTarget[next];
            }
        }
        return object;
    }

    // オブジェクトのパラメータと値を関連付ける
    const createWith = (/** @type {HTMLElement} */t, withObject) => {
        if (isPlainObject(withObject)) {
            if (withObject.object && withObject.parameter) {
                let object = findSource(withObject.object);
                if (!object) return ; // 取得できなかったら切り上げ
                // 値をセット
                t.value = object[withObject.parameter];
                // 値を関連づけ
                managerForDOMs.set(object, "0000", t, updateValue, {parameter: withObject.parameter}, withObject.parameter);
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

    const createListChildren = (t, liStruct, withObject) => {
        let list = findSource(withObject.object);
        if (Array.isArray(list)) {
            for (const object of list) {
                const li = document.createElement("li");
                li.classList.add("flex");
                t.append(li);
                createFromChildren(li, liStruct);
            }
        }
    }

    // 構造の配列をDOMに追加
    const createFromChildren = (/** @type {HTMLElement} */t, children) => {
        for (const child of children) {
            let element;
            // 要素の作成
            if (child.type == "div") {
                element = document.createElement("div");
                t.append(element);
                if (child.children) {
                    createFromChildren(element, child.children);
                }
            } else if (child.type == "input") {
                element = createLabeledInputNumber(t, child.name, child.name);
                createWith(element, child.withObject);
            } else if (child.type == "select") {
                element = createLabeledSelect(t, child.name, child.name);
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "なし";
                option.selected = true;
                element.append(option);
            } else if (child.type == "list") {
                element = createMinList(t,child.name);
                console.log(element)
                createListChildren(element.list, child.liStruct, child.withObject);
            } else if (child.type == "section") {
                const div = document.createElement("div");
                div.classList.add("section");
                element = createSection(t,child.name,div);
                if (child.children) {
                    createFromChildren(div, child.children);
                }
            }
        }
    }
    console.log(struct);
    target.replaceChildren();
    target.className = "";
    target.classList.add("scrollable","color2");

    createFromChildren(target,struct.DOM);
}