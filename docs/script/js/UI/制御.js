import { ResizerForDOM } from "./resizer.js";
import { TranslaterForDOM } from "./tranlater.js";
import { DOMsManager } from "./UIの更新管理.js";
// import { displayAnimationCollector } from "./アニメーションコレクターの表示.js";
// import { displayInspector } from "./インスペクタの表示.js";
// import { displayObjects } from "./オブジェクトの表示.js";
// import { displayGraphEditor } from "./グラフディタ.js";
// import { displayTimeLine } from "./タイムライン表示.js";
// import { displayHierarchy } from "./ヒエラルキーの表示.js";
// import { displayProperty } from "./プロパティの表示.js";
// import { displayRenderingOrder } from "./表示順番の表示.js";
// import { displayLayer } from "./レイヤーの表示.js";
import { CommandStack } from "./json/デバッグ.js";
import { CreatorForUI } from "../area/補助/UIの自動生成.js";

export const managerForDOMs = new DOMsManager();

export function createID() {
    var S="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var N=16;
    return Array.from(Array(N)).map(()=>S[Math.floor(Math.random()*S.length)]).join('');
}

export function createTag(target, type, option = {}) {
    const element = document.createElement(type);
    if (target) {
        target.append(element);
    }
    for (const key in option) {
        if (key == "class") {
            console.log("クラス", option[key].split(" ").filter(Boolean))
            element.classList.add(...option[key].split(" ").filter(Boolean));
        } else if (key == "style") {
            setStyle(element, option[key]);
        } else {
            element[key] = option[key];
        }
    }
    return element;
}

export function setStyle(element,style) {
    // style = style.replace(/\s+/g, ""); // 半角・全角スペースを削除
    const styles = style.split(";").filter(Boolean); // ;で区切る
    for (const style of styles) {
        const code = style.split(":");
        code[0] = code[0].replace(/\s+/g, "");
        if (code[1][0] == " ") {
            code[1] = code[1].slice(1);
        }
        element.style[code[0]] = code[1];
    }
}

export function createLabeledVecInput(target, axis, name, inputId) {
    const container = document.createElement("div");
    container.classList.add("flex-0");
    target.append(container);

    const inputForAxis0 = createLabeledInput(container,axis[0], "number", "", true);
    const inputForAxis1 = createLabeledInput(container,axis[1], "number", "", true);
    if (name) {
        container.setAttribute("name", name);
        inputForAxis0.setAttribute("name", `${name}-${axis[0]}`);
        inputForAxis1.setAttribute("name", `${name}-${axis[1]}`);
    }
    inputForAxis0.step = 0.0001;
    inputForAxis1.step = 0.0001;
    // return {[axis[0]]: inputForAxis0, [axis[1]]: inputForAxis1, container: container};
    return {axis0: inputForAxis0, axis1: inputForAxis1, container: container};
}

export function setLabel(target, labelText, inner) {
    const label = document.createElement("label");
    label.textContent = labelText;

    const div = document.createElement("div");
    div.className = "label-input";
    div.append(label,inner);
    target.append(div);
    return div;
}

export function createLabeledInput(target, labelText, inputType, name, isCoordinate = false, inputId) {
    const label = document.createElement("label");
    label.textContent = labelText;
    if (!inputId) inputId = createID();

    const div = document.createElement("div");
    if (name) {
        div.setAttribute("name", name); // name を設定
    }
    if (isCoordinate) {
        div.className = "coordinate-input";
    } else {
        div.className = "label-input";
    }
    let input;
    if (inputType == "checkbox") {
        input = createCheckbox();
    } else {
        input = document.createElement("input");
    }
    input.type = inputType;
    input.id = inputId;
    label.setAttribute("for", inputId); // for属性を設定
    div.append(label,input);
    target.append(div);

    return input;
}

export function createLabeledP(target, labelText, name, isCoordinate = false, pID) {
    const label = document.createElement("label");
    label.textContent = labelText;
    if (!pID) pID = createID();

    const div = document.createElement("div");
    if (name) {
        div.setAttribute("name", name); // name を設定
    }
    if (isCoordinate) {
        div.className = "coordinate-input";
    } else {
        div.className = "label-input";
    }
    let input;
    input = document.createElement("p");
    label.setAttribute("for", pID); // for属性を設定
    div.append(label,input);
    target.append(div);

    return input;
}

export function createLabeledSelect(target, labelText, name, ID) {
    const label = document.createElement("label");
    label.textContent = labelText;
    if (!ID) ID = createID();

    console.log(ID)
    const select = document.createElement("select");
    const div = document.createElement("div");
    div.className = "label-input";
    if (name) {
        div.setAttribute("name", name); // name を設定
    }
    div.append(label,select);
    target.append(div);
    select.id = ID;
    label.setAttribute("for", ID); // for属性を設定

    return select;
}

export function createMinButton(target, text) {
    const button = document.createElement("button");
    button.classList.add("button-min");
    button.textContent = text;
    target.append(button)
    return button;
}

export function createMinList(target, listName) {
    const listNameTag = document.createElement("p");
    listNameTag.textContent = listName;
    const container = document.createElement("div");
    container.classList.add("flex-gap10px");

    const actionButtons = document.createElement("div");
    actionButtons.style.width = "20px";

    const appendButton = createMinButton(actionButtons, "+");
    const deleteButton = createMinButton(actionButtons, "-");
    const listContainer = document.createElement("ul");
    listContainer.classList.add("minList");
    listContainer.style.height = "200px";
    new ResizerForDOM(listContainer, "h", 100, 600);
    const list = document.createElement("ul");
    list.classList.add("scrollable","gap-2px");
    listContainer.append(list);

    container.append(listContainer, actionButtons)
    target.append(listNameTag);
    target.append(container);
    return {container: container, listContainer: listContainer, list: list, appendButton: appendButton, deleteButton: deleteButton};
}

export function createMinListNoAppend(listName) {
    const target = document.createElement("div");
    const listNameTag = document.createElement("p");
    listNameTag.textContent = listName;
    const container = document.createElement("div");
    container.classList.add("flex-gap10px");

    const actionButtons = document.createElement("div");
    actionButtons.style.width = "20px";

    const appendButton = createMinButton(actionButtons, "+");
    const deleteButton = createMinButton(actionButtons, "-");
    const listContainer = document.createElement("ul");
    listContainer.classList.add("minList");
    listContainer.style.height = "200px";
    new ResizerForDOM(listContainer, "h", 100, 600);
    const list = document.createElement("ul");
    list.classList.add("scrollable","gap-2px");
    listContainer.append(list);

    container.append(listContainer, actionButtons)
    target.append(listNameTag);
    target.append(container);
    return target;
}

export function createMinWorkSpace(target, listName, workSpace = null, buttons = []) {
    const listNameTag = document.createElement("p");
    listNameTag.textContent = listName;
    const container = document.createElement("div");
    container.classList.add("flex-gap10px");

    const actionButtons = document.createElement("div");
    actionButtons.style.width = "20px";

    const buttonsForDOM = {};
    for (const button of buttons) {
        buttonsForDOM[button] = createMinButton(actionButtons, button);
    }
    const listContainer = document.createElement("ul");
    listContainer.classList.add("minList");
    listContainer.style.height = "200px";
    new ResizerForDOM(listContainer, "h", 100, 600);
    if (!workSpace) {
        workSpace = document.createElement("div");
    }
    listContainer.append(workSpace);

    container.append(listContainer, actionButtons)
    target.append(listNameTag);
    target.append(container);
    return {container: container, listContainer: listContainer, list: workSpace, buttons: buttonsForDOM};
}

export function createSection(target, sectionName, section, className = "section") {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    const label = document.createElement("label");
    const span = document.createElement("span");
    span.classList.add("arrow");
    label.append(checkbox,span);

    const headerDiv = document.createElement("div");
    headerDiv.classList.add("flex")

    const sectionNameP = document.createElement("p");
    sectionNameP.textContent = sectionName;

    headerDiv.append(label, sectionNameP);

    const containerDiv = document.createElement("div");
    containerDiv.classList.add(className);
    containerDiv.setAttribute("name", sectionName);

    containerDiv.append(headerDiv, section);

    checkbox.addEventListener("change", () => {
        // checkbox.checked = !checkbox.checked;
        section.classList.toggle('hidden');
    });

    target.append(containerDiv);

    return containerDiv;
}

// チェック
export function createChecks(target, checks) {
    const div = createTag(target, "div", {class: "flex"});
    const result = {html: div, checkList: []};
    checks.forEach((check, index) => {
        const element = createCheckbox2(div, check.icon, check.label);
        result.checkList.push(element.check);
        if (index == 0) {
            element.div.style.borderTopRightRadius = "0px";
            element.div.style.borderBottomRightRadius = "0px";
        } else if (index == checks.length - 1) {
            element.div.style.borderTopLeftRadius = "0px";
            element.div.style.borderBottomLeftRadius = "0px";
        } else {
            element.div.style.borderRadius = "0px";
        }
    })
    return result;
}
function createCheckbox2(target, icon, text) {
    const check = document.createElement("input");
    check.type = "checkbox";
    const label = document.createElement("label");
    label.classList.add("box");
    const div = document.createElement("div");
    div.classList.add("radioElement");
    createIcon(div, icon);
    const textNode = document.createTextNode(text);
    div.append(textNode);
    label.append(check,div);
    target.append(label);
    return {label, div, check};
}

export function createCheckbox(type = "custom-checkbox", text = "") {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    const label = document.createElement("label");
    label.classList.add("box");
    label.setAttribute("name", "checkbox");
    const span = document.createElement("span");
    if (type == "button-checkbox") {
        const textTag = document.createElement("p");
        textTag.textContent = `${text}`;
        textTag.classList.add("button-checkbox-text");
        span.append(textTag);
    }
    if (type == "eye-icon") {
        const pupil = document.createElement("span");
        pupil.classList.add("eye-icon-pupil");
        span.append(pupil);
    }
    span.classList.add(type);
    label.append(checkbox,span);
    label.inputDOM = checkbox;
    return label;
}

// ラジオ
export function createRadios(target, radios) {
    const fieldset = createTag(target, "fieldset", {class: "flex"});
    const legend = createTag(fieldset, "legend");
    radios.forEach((radio, index) => {
        // const element = createTag(fieldset, "input", {type: "radio"});
        const element = createRadio(fieldset, "test", radio.icon, radio.label);
        if (index == 0) {
            element.div.style.borderTopRightRadius = "0px";
            element.div.style.borderBottomRightRadius = "0px";
        } else if (index == radios.length - 1) {
            element.div.style.borderTopLeftRadius = "0px";
            element.div.style.borderBottomLeftRadius = "0px";
        } else {
            element.div.style.borderRadius = "0px";
        }
    })
    console.log(fieldset)
}
export function createRadio(target, radioName, icon, text) {
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.setAttribute("name", radioName);
    const label = document.createElement("label");
    label.classList.add("box");
    label.setAttribute("name", "radio");
    const div = document.createElement("div");
    div.classList.add("radioElement");
    createIcon(div, icon);
    const textNode = document.createTextNode(text);
    div.append(textNode);
    label.append(radio,div);
    target.append(label);
    return {label, div, radio};
}

// ボタン
export function createButton(target, icon, text = "") {
    const button = document.createElement("button");
    createIcon(button, icon);
    const textNode = document.createTextNode(text);
    button.append(textNode);
    target.append(button);
    return button;
}
export function createGroupButton(target, buttons) {
    const container = createTag(target, "div", {class: "flex"});
    buttons.forEach((button, index) => {
        const element = createButton(container,button.icon, button.label);
        if (index == 0) {
            element.style.borderTopRightRadius = "0px";
            element.style.borderBottomRightRadius = "0px";
        } else if (index == buttons.length - 1) {
            element.style.borderTopLeftRadius = "0px";
            element.style.borderBottomLeftRadius = "0px";
        } else {
            element.style.borderRadius = "0px";
        }
    })
}

export function createIcon(target, imgName) {
    console.log(target)
    const container = document.createElement("div");
    container.classList.add("icon");
    const icon = document.createElement("img");
    icon.src = `config/画像データ/ui_icon/${imgName}.png`;
    let errorC = 0;
    icon.addEventListener("error", () => {
        console.warn("画像の読み込みに失敗",imgName)
        if (errorC < 5) {
            errorC ++;
            icon.src = `config/画像データ/ui_icon/${imgName}.png`;
        } else {
            console.error("画像の読み込みに失敗",imgName,`config/画像データ/ui_icon/${imgName}.png`)
        }
    })
    container.append(icon);
    target.append(container);
}

export function createToolBar(target, tools) {
    const container = document.createElement("ul");
    container.classList.add("toolbar");
    for (const tool of tools) {
        const item = document.createElement("li");
        createIcon(item, tool);
        container.append(item);
    }
    target.append(container);
    return container;
}

export function createDoubleClickInput(fn, object) {
    const inputTag = document.createElement("input");
    inputTag.type = "text";
    inputTag.classList.add("dblClickInput");
    inputTag.setAttribute('readonly', true);
    inputTag.addEventListener('dblclick', () => {
        inputTag.removeAttribute('readonly');
        inputTag.focus();
    });

    inputTag.addEventListener('blur', () => {
        inputTag.setAttribute('readonly', true);
    });
    return inputTag;
}

function setModeSelectOption(target, selectMode) {
    for (const mode in modes) {
        const modeSelectOptionTag = document.createElement('option');
        modeSelectOptionTag.textContent = mode;
        // modeSelectOptionTag.style.width = "10px";
        // modeSelectOptionTag.style.height = "10px";
        // modeSelectOptionTag.style.backgroundImage = `url(config/画像データ/ui_icon/${mode}.png)`;
        modeSelectOptionTag.value = mode;
        if (mode == selectMode) {
            modeSelectOptionTag.selected = true;
        }
        target.appendChild(modeSelectOptionTag);
    }
}

export function createShelf(target, title = "テスト") {
    const container = document.createElement("div");
    container.classList.add("shelf");

    const inner = document.createElement("div");
    inner.classList.add("section");

    const header = createSection(container, title, inner, "shelf-container").querySelector("div");
    const translater = new TranslaterForDOM(header, container, target);
    // const resizer = new ResizerForDOM(inner, "w", 100, 500);
    target.append(container);
    return {container: container, inner: inner};
}

export function createRange(target, options) {
    const range = createTag(target, "input", options);
    range.type = "range";
    target.append(range);
    return range;
}

export function updateRangeStyle(target) {
    const value = target.value;
    const min = target.min;
    const max = target.max;
    const percentage = ((value - min) / (max - min)) * 100;
    target.style.background = `linear-gradient(to right,rgb(172, 194, 183) ${percentage}%,rgba(0, 0, 0, 0) ${percentage}%)`;
}
export function setRangeStyle(target) {
    updateRangeStyle(target);
    target.addEventListener("input", () => {
        updateRangeStyle(target);
    });
}

export const views = [];
export function addShelfToAllView(shelfName, initFn, updateFn) {
    for (const view of views) {
        view.addShelf(shelfName, initFn, updateFn);
    }
}

export function deleteAllShelfForAllView() {
    for (const view of views) {
        view.deleteAll();
    }
}

export function deleteShelfForAllView(shelfName) {
    
}

export function updateLoad(processName,percentage,processDetail = "") {
    let progress = Math.min(percentage, 100); // 100% を超えないように制限
    document.getElementById("progressMessage").innerText = processName;
    // document.getElementById("progressMessage").textContent = text;
    document.getElementById("progressBar").style.width = progress + "%";
    document.getElementById("progressText").innerText = progress + "%";
    if (progress >= 100) {
        setTimeout(() => {
            document.getElementById("loadingModal").classList.add("hidden");
        }, 10); // 少し待ってからモーダルを消す
    } else {
        document.getElementById("loadingModal").classList.remove("hidden");
    }
    document.getElementById("progressMessage").offsetWidth; // 強制リフロー
}