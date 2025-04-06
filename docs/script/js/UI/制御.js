import { keysDown, activeViewUpdate, editorParameters, activeView, stateMachine } from "../main.js";
import { GPU } from "../webGPU.js";
import { Camera } from "../カメラ.js";
import { updateForContextmenu } from "../コンテキストメニュー/制御.js";
import { vec2 } from "../ベクトル計算.js";
import { renderingParameters } from "../レンダリングパラメーター.js";
import { ConvertCoordinate } from "../座標の変換.js";
import { Select } from "../選択.js";
import { ResizerForDOM } from "./resizer.js";
import { TranslaterForDOM } from "./tranlater.js";
import { DOMsManager } from "./UIの更新管理.js";
import { displayAnimationCollector } from "./アニメーションコレクターの表示.js";
import { displayInspector } from "./インスペクタの表示.js";
import { displayObjects } from "./オブジェクトの表示.js";
import { displayGraphEditor } from "./グラフディタ.js";
import { displayTimeLine } from "./タイムライン表示.js";
import { displayHierarchy } from "./ヒエラルキーの表示.js";
import { Render } from "./ビューの表示.js";
import { displayProperty } from "./プロパティの表示.js";
import { FunctionTranceShelfe, TranceShelfe } from "./シェリフ.js";
import { displayRenderingOrder } from "./表示順番の表示.js";
import { displayLayer } from "./レイヤーの表示.js";
import { CommandStack } from "./json/デバッグ.js";
import { CreatorForUI } from "./UIの自動生成.js";

export const managerForDOMs = new DOMsManager();

function displayCommandStack(targetDiv, groupID) {
    const UI_ = new CommandStack();
    const ui = new CreatorForUI();
    ui.create(targetDiv,UI_.struct, UI_.inputObject);
}

const modes = {
    "ビュー": displayHierarchy,
    "オブジェクト": displayObjects,
    "ヒエラルキー": displayHierarchy,
    "レイヤー": displayLayer,
    "アニメーションコレクター": displayAnimationCollector,
    "表示順番": displayRenderingOrder,
    "インスペクタ": displayInspector,
    "プロパティ": displayProperty,
    "タイムライン": displayTimeLine,
    "グラフエディタ": displayGraphEditor,
    "デバッグ": displayCommandStack,
};

export const updateDataForUI = {
    "ビュー": false,
    "オブジェクト": false,
    "ヒエラルキー": false,
    "アニメーションコレクター": false,
    "表示順番": false,
    "インスペクタ": false,
    "プロパティ": false,
    "タイムライン": false,
};

const specialTag = {
    "フレーム": {tags: [], updateFn: (tag,object) => {
        tag.checked = object.keyframe.hasKeyFromFrame(renderingParameters.keyfarameCount);
    }},
    "フレーム表示": {
        tags: [],
        updateFn: (tag,config) => {
            tag.style.setProperty("--label", `'${Math.round(renderingParameters.keyfarameCount)}'`);
            tag.style.left = `${(renderingParameters.keyfarameCount + Math.abs(config.startFrame)) * config.gap}px`;
        }
    }
}

const updateDataForSpecialTag = {
    "フレーム": true,
    "フレーム表示": true,
}

const objectDataAndRelateTags = new Map();

const gridInteriorObjects = [];

// export class GridInterior {
//     constructor(tag, initMode) {
//         gridInteriorObjects.push(this);
//         this.groupID = createID();
//         this.config = {};
//         this.targetTag = tag;
//         this.targetTag.className = "grid-container";

//         this.modeDiv = document.createElement("div");
//         this.modeDiv.className = "modeSelect";

//         this.modeSelectTag = document.createElement('select');
//         setModeSelectOption(this.modeSelectTag, initMode);

//         this.mainDiv = document.createElement("div");
//         this.mainDiv.className = "grid-main";

//         this.modeDiv.append(this.modeSelectTag, this.createModeToolBar(initMode));

//         this.targetTag.append(this.modeDiv, this.mainDiv);

//         this.tags = new Map();

//         this.modeSelectTag.addEventListener('change', () => {
//             if (this.modeSelectTag.value == "ビュー") {
//                 this.mainDiv.className = "grid-main";
//                 this.mainDiv.replaceChildren();
//                 managerForDOMs.deleteGroup(this.groupID);
//                 resetTag(this.tags);
//                 this.targetTag.innerHTML = "";
//                 gridInteriorObjects.splice(gridInteriorObjects.indexOf(this), 1);
//                 new View(this.targetTag);
//             } else {
//                 this.mainDiv.className = "grid-main";
//                 this.mainDiv.replaceChildren();
//                 managerForDOMs.deleteGroup(this.groupID);
//                 resetTag(this.tags);
//                 // this.modeDiv.append(this.modeSelectTag, this.createModeToolBar(this.modeSelectTag.value));
//                 this.tags.clear();
//                 modes[this.modeSelectTag.value](this.mainDiv, this.groupID);
//             }
//         });

//         modes[this.modeSelectTag.value](this.mainDiv, this.groupID);

//         this.mainDiv.addEventListener('contextmenu', (e) => {
//             e.preventDefault();
//             updateForContextmenu(this.modeSelectTag.value,[e.clientX,e.clientY]);
//         });
//     }

//     createModeToolBar(mode) {
//         if (mode == "オブジェクト") {
//             const tagDiv = document.createElement("div");
//             const filteringSelectTag = document.createElement('select');
//             for (const type of ["すべて","グラフィックメッシュ","モディファイア","ベジェモディファイア","回転モディファイア"]) {
//                 const filteringSelectOptionTag = document.createElement('option');
//                 filteringSelectOptionTag.textContent = type;
//                 filteringSelectOptionTag.value = type;
//                 filteringSelectTag.appendChild(filteringSelectOptionTag);
//             }
//             filteringSelectTag.addEventListener('change', () => {
//                 displayObjects(this.mainDiv,false,filteringSelectTag.value);
//             });
//             tagDiv.append(filteringSelectTag);
//             return tagDiv;
//         } else if (mode == "アニメーション") {
//             const tagDiv = document.createElement("div");
//             return tagDiv;
//         } else if (mode == "タイムライン") {
//             const tagDiv = document.createElement("div");
//             const isReplayCheckbox = document.createElement("input");
//             isReplayCheckbox.type = "checkbox";
//             isReplayCheckbox.checked = renderingParameters.isReplay;
//             isReplayCheckbox.addEventListener("change", () => {
//                 renderingParameters.isReplay = isReplayCheckbox.checked;
//             })
//             tagDiv.append(isReplayCheckbox);
//             return tagDiv;
//         }
//         const tagDiv = document.createElement("div");
//         return tagDiv;
//     }

//     update(updateData) {
//         if (updateData[this.modeSelectTag.value]) {
//             managerForDOMs.deleteGroup(this.groupID);
//             modes[this.modeSelectTag.value](this.mainDiv, this.groupID);
//         }
//     }
// }
export class GridInterior {
    constructor(tag, initMode) {
        gridInteriorObjects.push(this);
        this.groupID = createID();
        this.config = {};
        this.targetTag = tag;
        this.targetTag.className = "grid-container";

        this.modeDiv = document.createElement("div");
        this.modeDiv.className = "modeSelect";

        this.modeSelectTag = document.createElement('select');
        setModeSelectOption(this.modeSelectTag, initMode);

        this.mainDiv = document.createElement("div");
        this.mainDiv.className = "grid-main";

        this.modeDiv.append(this.modeSelectTag, this.createModeToolBar(initMode));

        this.targetTag.append(this.modeDiv, this.mainDiv);

        this.tags = new Map();

        this.modeSelectTag.addEventListener('change', () => {
            if (this.modeSelectTag.value == "ビュー") {
                this.mainDiv.className = "grid-main";
                this.mainDiv.replaceChildren();
                managerForDOMs.deleteGroup(this.groupID);
                resetTag(this.tags);
                this.targetTag.innerHTML = "";
                gridInteriorObjects.splice(gridInteriorObjects.indexOf(this), 1);
                new View(this.targetTag);
            } else {
                this.mainDiv.className = "grid-main";
                this.mainDiv.replaceChildren();
                managerForDOMs.deleteGroup(this.groupID);
                resetTag(this.tags);
                // this.modeDiv.append(this.modeSelectTag, this.createModeToolBar(this.modeSelectTag.value));
                this.tags.clear();
                modes[this.modeSelectTag.value](this.mainDiv, this.groupID);
            }
        });

        modes[this.modeSelectTag.value](this.mainDiv, this.groupID);

        this.mainDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            updateForContextmenu(this.modeSelectTag.value,[e.clientX,e.clientY]);
        });
    }

    createModeToolBar(mode) {
        if (mode == "オブジェクト") {
            const tagDiv = document.createElement("div");
            const filteringSelectTag = document.createElement('select');
            for (const type of ["すべて","グラフィックメッシュ","モディファイア","ベジェモディファイア","回転モディファイア"]) {
                const filteringSelectOptionTag = document.createElement('option');
                filteringSelectOptionTag.textContent = type;
                filteringSelectOptionTag.value = type;
                filteringSelectTag.appendChild(filteringSelectOptionTag);
            }
            filteringSelectTag.addEventListener('change', () => {
                displayObjects(this.mainDiv,false,filteringSelectTag.value);
            });
            tagDiv.append(filteringSelectTag);
            return tagDiv;
        } else if (mode == "アニメーション") {
            const tagDiv = document.createElement("div");
            return tagDiv;
        } else if (mode == "タイムライン") {
            const tagDiv = document.createElement("div");
            const isReplayCheckbox = document.createElement("input");
            isReplayCheckbox.type = "checkbox";
            isReplayCheckbox.checked = renderingParameters.isReplay;
            isReplayCheckbox.addEventListener("change", () => {
                renderingParameters.isReplay = isReplayCheckbox.checked;
            })
            tagDiv.append(isReplayCheckbox);
            return tagDiv;
        }
        const tagDiv = document.createElement("div");
        return tagDiv;
    }

    update(updateData) {
        if (updateData[this.modeSelectTag.value]) {
            managerForDOMs.deleteGroup(this.groupID);
            modes[this.modeSelectTag.value](this.mainDiv, this.groupID);
        }
    }
}

export function resetTag(tags) {
    tags.forEach((value,object) => {
        const allTag = tags.get(object);
        if (Array.isArray(allTag)) {
            for (const tag of allTag) {
                if (tag instanceof HTMLElement) {
                    tag.remove();
                }
            }
        } else {
            if (allTag instanceof HTMLElement) {
                allTag.remove();
            }
        }
        tags.delete(object);
    })
}

export function updateForUI() {
    for (const [key, value] of objectDataAndRelateTags) {
        if (key.delete) {
            // 削除
        }
        for (const [key2, value2] of value.map) {
            for (const value3 of value2) {
                value3.tag[value3.writeTarget] = key[key2];
            }
        }
    }
    for (const key in specialTag) {
        if (updateDataForSpecialTag[key]) {
            const data = specialTag[key];
            for (const tag of data.tags) {
                data.updateFn(...tag);
            }
        }
    }
    for (const gridInteriorObject of gridInteriorObjects) {
        if (gridInteriorObject instanceof View) {
            gridInteriorObject.update();
        } else {
            gridInteriorObject.update(updateDataForUI);
        }
    }
    for (const keyName in updateDataForUI) {
        updateDataForUI[keyName] = false;
    }
}

export function createID() {
    var S="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var N=16;
    return Array.from(Array(N)).map(()=>S[Math.floor(Math.random()*S.length)]).join('');
}

export function createTag(target, type, option = {}) {
    const element = document.createElement(type);
    target.append(element);
    for (const key in option) {
        if (key == "class") {
            console.log("クラス", option[key].split(" ").filter(Boolean))
            element.classList.add(...option[key].split(" ").filter(Boolean));
        } else {
            element[key] = option[key];
        }
    }
    return element;
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
    span.classList.add(type);
    label.append(checkbox,span);
    label.inputDOM = checkbox;
    return label;
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

export function createSection(target, sectionName, section, className = "inspector-container") {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    const label = document.createElement("label");
    const span = document.createElement("span");
    span.classList.add("hidden-checkbox");
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

export function createIcon(target, imgName) {
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
            console.error("画像の読み込みに失敗",imgName)
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

export function setRangeStyle(target) {
    target.addEventListener("input", () => {
        const value = target.value;
        const min = target.min;
        const max = target.max;
        const percentage = ((value - min) / (max - min)) * 100;
        target.style.background = `linear-gradient(to right,rgb(172, 194, 183) ${percentage}%, #404040 ${percentage}%)`;
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

export class View {
    constructor(tag) {
        views.push(this);
        this.groupID = createID();
        gridInteriorObjects.push(this);
        this.targetTag = tag;
        this.targetTag.className = "grid-container";

        this.modeDiv = document.createElement("div");
        this.modeDiv.className = "modeSelect";

        this.modeSelectTag = document.createElement('select');
        setModeSelectOption(this.modeSelectTag, "ビュー");

        this.modeDiv.append(this.modeSelectTag);
        const circleSelectRadiusInput = createLabeledInput(this.modeDiv, "選択半径", "number");
        circleSelectRadiusInput.value = editorParameters.selectRadius;
        circleSelectRadiusInput.addEventListener("change", () => {
            editorParameters.circleSelectRenderingConfigGroup.setWidth(circleSelectRadiusInput.value);
        })
        const smoothTypeSelect = createLabeledSelect(this.modeDiv, "スムーズタイプ");
        for (const type of [["通常", 0],["線形", 1],["逆2乗",2]]) {
            const sleectElement = document.createElement('option'); // h1要素に配列の要素を設定
            sleectElement.value = type[1]; // h1要素に配列の要素を設定
            sleectElement.textContent = type[0]; // h1要素に配列の要素を設定
            smoothTypeSelect.append(sleectElement);
            if (sleectElement[1] == editorParameters.smoothType) sleectElement.selected = true;
        }

        smoothTypeSelect.addEventListener("change", () => {
            editorParameters.smoothType = smoothTypeSelect.value;
        })
        const smoothRadiusInput = createLabeledInput(this.modeDiv, "スムーズ半径", "number");
        smoothRadiusInput.value = editorParameters.smoothRadius;
        smoothRadiusInput.addEventListener("change", () => {
            editorParameters.smoothRadius = smoothRadiusInput.value;
            GPU.writeBuffer(editorParameters.smoothRadiusBuffer, new Float32Array([editorParameters.smoothRadius]));
        })

        this.gizmoConfig = {
            visible: true
        }

        const gizmoVisibleCheckbox = createLabeledInput(this.modeDiv, "ギズモ", "checkbox");
        gizmoVisibleCheckbox.inputDOM.checked = this.gizmoConfig.visible;
        gizmoVisibleCheckbox.inputDOM.addEventListener("change", () => {
            this.gizmoConfig.visible = gizmoVisibleCheckbox.inputDOM.checked;
        })

        this.modeSelectTag.addEventListener('change', () => {
            this.targetTag.innerHTML = "";
            this.render = null;
            this.camera = null;
            this.convertCoordinate = null;
            this.select = null;
            resizeObserver.unobserve(this.cvs);
            if (activeView == this) {
                for (const grid of gridInteriorObjects) {
                    if (grid instanceof View) {
                        activeViewUpdate(grid);
                    }
                }
            }
            gridInteriorObjects.splice(gridInteriorObjects.indexOf(this), 1);
            views.splice(views.indexOf(this), 1);
            new GridInterior(this.targetTag, this.modeSelectTag.value);
        });

        this.gridMainTag = document.createElement("div");
        this.gridMainTag.className = "grid-main";

        this.cvs = document.createElement("canvas");
        this.cvs.className = "renderingTarget";

        this.shelfRange = document.createElement("div");
        this.shelfRange.className = "shelf-range";

        this.toolbar = createToolBar(this.gridMainTag, ["選択", "並行移動", "拡大縮小", "回転", "頂点追加", "頂点削除"]);
        this.gridMainTag.classList.add("viewGrid");
        this.gridMainTag.append(this.cvs, this.shelfRange);
        this.targetTag.append(this.modeDiv,this.gridMainTag);
        this.cvsRect = this.cvs.getBoundingClientRect();
        this.cvs.width = this.cvsRect.width * 2;
        this.cvs.height = this.cvsRect.height * 2;
        this.cvsK = this.cvs.height / this.cvsRect.height;
        this.camera = new Camera();
        this.render = new Render(this.cvs, this.camera, this.gizmoConfig);

        this.shelfs = [];

        this.convertCoordinate = new ConvertCoordinate(this.cvs,this.camera);
        this.select = new Select(this.convertCoordinate);

        this.mouseState = {client: [0,0], click: false, rightClick: false, hold: false, holdFrameCount: 0, clickPosition: [0,0], clickPositionForGPU:[0,0], position: [0,0], lastPosition: [0,0], positionForGPU: [0,0], lastPositionForGPU: [0,0], movementForGPU: [0,0]};

        // ホイール操作
        this.cvs.addEventListener('wheel', (event) => {
            if (keysDown["Alt"]) {
                this.camera.zoom += event.deltaY / 200;
                this.camera.zoom = Math.max(Math.min(this.camera.zoom,this.camera.zoomMax),this.camera.zoomMin);
            } else {
                this.camera.position = vec2.addR(this.camera.position, vec2.scaleR([-event.deltaX, event.deltaY], 1 / this.camera.zoom));
            }

            event.preventDefault();
        }, { passive: false });

        this.cvs.addEventListener('mousemove', (event) => {
            const mouseX = (event.clientX - this.cvsRect.left) * this.cvsK; // Calculate mouse X relative to canvas
            const mouseY = this.cvs.height - ((event.clientY - this.cvsRect.top) * this.cvsK); // Calculate mouse Y relative to canvas
            this.mouseState.client = [event.clientX,event.clientY];
            this.mouseState.position = [mouseX,mouseY];
            this.mouseState.positionForGPU = this.convertCoordinate.screenPosFromGPUPos(this.mouseState.position);
        });

        this.cvs.addEventListener('mousedown', (event) => {
            if (event.button == 0) {
                activeViewUpdate(this);
                const mouseX = (event.clientX - this.cvsRect.left) * this.cvsK; // Calculate mouse X relative to canvas
                const mouseY = this.cvs.height - ((event.clientY - this.cvsRect.top) * this.cvsK); // Calculate mouse Y relative to
                this.mouseState.client = [event.clientX,event.clientY];
                this.mouseState.clickPosition = [mouseX,mouseY];
                this.mouseState.clickPositionForGPU = this.convertCoordinate.screenPosFromGPUPos(this.mouseState.position);
                this.mouseState.position = [mouseX,mouseY];
                this.mouseState.positionForGPU = this.convertCoordinate.screenPosFromGPUPos(this.mouseState.position);
                this.mouseState.hold = true;
                this.mouseState.holdFrameCount = 0;
                this.mouseState.click = true;
            }
        });

        this.cvs.addEventListener('mouseup', () => {
            this.mouseState.hold = false;
            this.mouseState.holdFrameCount = 0;
        });

        this.cvs.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            this.mouseState.rightClick = true;
        });

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                // 要素の新しいサイズを取得
                this.cvsRect = this.cvs.getBoundingClientRect();
                this.cvs.width = this.cvsRect.width * 3;
                this.cvs.height = this.cvsRect.height * 3;
                this.cvsK = this.cvs.height / this.cvsRect.height;
                this.render.resizeCVS();
            }
        });

        this.gridMainTag.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            updateForContextmenu("ビュー",[e.clientX,e.clientY]);
        });

        // 要素のリサイズを監視
        resizeObserver.observe(this.cvs);
    }

    // シェリフの作成
    addShelf(shelfName, initFn, updateFn) {
        const shelf = createShelf(this.shelfRange, shelfName);
        this.shelfs.push(shelf);
        // initSelectShelf(this.groupID, shelf);
        initFn(this.groupID, shelf);
    }

    // 関数シェリフの作成
    addFunctionTranceShelfe(targetFn, argumentArray, shelfName = "") {
        const shelf = createShelf(this.shelfRange, shelfName ? shelfName : targetFn.name);
        new FunctionTranceShelfe(this.groupID, shelf.inner, targetFn, argumentArray);
        this.shelfs.push(shelf);
    }

    // トレースシェリフの作成
    addTranceShelfe(targetObject, argumentArray, shelfName) {
        const shelf = createShelf(this.shelfRange, shelfName);
        new TranceShelfe(this.groupID, shelf.inner, targetObject, argumentArray);
        this.shelfs.push(shelf);
    }

    deleteAll() {
        for (const shelf of this.shelfs) {
            shelf.container.remove();
        }
        this.shelfs.length = 0;
    }

    update() {
        this.camera.updateCamera();
        this.render.rendering();
        this.render.renderGizmo();
    }
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