import { stateMachine } from "../main.js";
import { getFuntion, isNumber, isPlainObject, IsString } from "../utility.js";
import { createCheckbox, createLabeledInput, createLabeledP, createLabeledSelect, createLabeledVecInput, managerForDOMs } from "./制御.js";

export function updateSelectNum(object, groupID, /** @type {HTMLElement} */DOM) {
    if (stateMachine.state.data.selectIndexs) {
        DOM.textContent = stateMachine.state.data.selectIndexs.length;
    } else {
        DOM.textContent = "なし";
    }
}

export function updateSelectShelf(object, groupID, DOM) {
    /** @type {HTMLElement} */
    const selectNum = DOM.selectNum;

    selectNum.textContent = stateMachine.state.data.selectIndexs.length;
}

export function initSelectShelf(groupID, DOM) {
    /** @type {HTMLElement} */
    const t = DOM.inner;
    const selectNum = createLabeledP(t, "選択数");
    managerForDOMs.set("モーダル-選択情報-選択数", groupID, selectNum, updateSelectNum);
    managerForDOMs.updateGroupInObject("モーダル-選択情報-選択数", groupID);
    // managerForDOMs.set("モーダル-選択情報", this.groupID, this.shelf1, updateSelectShelf);
}

export function updateMeshShelf(object, groupID, DOM, others) {
    /** @type {HTMLElement} */
    const t = DOM.inner;
    if (others.object.type == "ボーンモディファイア") {
        const selectNum = createLabeledP(t, "選択中");
        selectNum.textContent = others;
    }
    // managerForDOMs.set("モーダル-選択情報", this.groupID, this.shelf1, updateSelectShelf);
}

export function initMeshShelf(groupID, DOM) {
    /** @type {HTMLElement} */
    const t = DOM.inner;
    const createMeshButton = document.createElement("button");
    createMeshButton.textContent = "自動";
    createMeshButton.addEventListener("click", () => {
        stateMachine.state.data.activeObject.editor.createEdgeFromTexture(6,10);
        // activeView.addFunctionTranceShelfe({object: stateMachine.state.data.activeObject.editor, targetFn: "createEdgeFromTexture"}, [{name: "ピクセル密度", type: {type: "入力", inputType: "数字", option: {initValue: 6}}}, {name: "余白", type: {type: "入力", inputType: "数字", option: {initValue: 10}}}]);
    })

    const appenButton = createCheckbox("button-checkbox", "追加");
    const deleteButton = createCheckbox("button-checkbox", "削除");
    t.append(createMeshButton,appenButton,deleteButton);
}

export class FunctionTranceShelfe {
    constructor(groupID, DOM, targetFn, argumentArray) {
        /** @type {HTMLElement} */
        this.DOM = DOM;
        this.groupID = groupID;
        this.targetFn = targetFn; // 実行する関数

        // argumentArray -> [argument,...]
        // argument -> {name: "名前", type: "種類"}
        // type -> {type: "入力", inputType: "文字"}
        //         {type: "入力", inputType: "数字", option: {min: 任意の数字, max: 任意の数字, step: 任意の数字}}
        //         {type: "入力", inputType: "配列", option: {struct: []}}
        //         {type: "入力", inputType: "ベクトル", option: {axis: [横軸の名前,縦軸の名前]}
        //         {type: "選択", choices: [選択肢0 : {text: "表示名", value: "値"},...]}
        this.submitArgumentArray = [];
        const createEvent = (tag, index, option = "text", array = this.submitArgumentArray) => {
            tag.addEventListener("change", () => {
                array[index] = option == "number" ? Number(tag.value) : tag.value;
                this.submit();
            })
        }
        for (let argumentIndex = 0; argumentIndex < argumentArray.length; argumentIndex ++) {
            const argument = argumentArray[argumentIndex];
            const argumentType = argument.type;
            if (argumentType.type == "入力") {
                const inputType = argumentType.inputType;
                if (inputType == "文字") {
                    this.submitArgumentArray.push("入力なし");
                    const input = createLabeledInput(this.DOM, argument.name, "text");
                    if (argumentType.option?.initValue) {
                        this.submitArgumentArray[argumentIndex] = argumentType.option.initValue;
                        input.value = argumentType.option.initValue;
                    }
                    createEvent(input, argumentIndex);
                } else if (inputType == "数字") {
                    this.submitArgumentArray.push(NaN);
                    const input = createLabeledInput(this.DOM, argument.name, "number");
                    if (isNumber(argumentType.option?.initValue)) {
                        this.submitArgumentArray[argumentIndex] = argumentType.option.initValue;
                        input.value = argumentType.option.initValue;
                    }
                    createEvent(input, argumentIndex, "number");
                } else if (inputType == "ベクトル") {
                    const vec = [0,0];
                    this.submitArgumentArray.push(vec);
                    const {container: container, axis0: inputForAxis0, axis1: inputForAxis1} = createLabeledVecInput(this.DOM, container,argumentType.option.axis);
                    createEvent(inputForAxis0, 0, "number", vec);
                    createEvent(inputForAxis1, 1, "number", vec);
                    if (isNumber(argumentType.option.initValue)) {
                        vec[0] = argumentType.option.initValue[0];
                        inputForAxis0.value = argumentType.option.initValue[0];
                        vec[1] = argumentType.option.initValue[1];
                        inputForAxis1.value = argumentType.option.initValue[1];
                    }
                }
            } else if (argumentType.type == "選択") {
                this.submitArgumentArray.push("選択なし");
                const select = createLabeledSelect(this.DOM, argument.name);
                for (const item of argumentType.choices) {
                    if (IsString(item)) {
                        const option = document.createElement("option");
                        option.textContent = item;
                        option.value = item;
                        select.append(option);
                    } else if (isPlainObject(item)) {
                        const option = document.createElement("option");
                        option.textContent = item.text;
                        option.value = item.value;
                        select.append(option);
                    }
                }
                createEvent(select, argumentIndex);
            }
        }
    }

    submit() {
        const resource = this.targetFn;
        if (typeof resource === 'function') {
            resource(...this.submitArgumentArray);
        } else if (resource.object && resource.targetFn) {
            resource.object[resource.targetFn](...this.submitArgumentArray);
        } else {
            console.warn("関数が見つかりません", resource);
        }
    }
}

function setNumberInputOption(DOM, option) {
    DOM.step = option.step;
    DOM.min = option.min;
    DOM.max = option.max;
}

export class TranceShelfe {
    constructor(groupID, DOM, targetObject, argumentArray) {
        if (Array.isArray(targetObject)) {
            /** @type {HTMLElement} */
            this.DOM = DOM;
            this.groupID = groupID;
            this.targetObject = targetObject; // 書き換える対象

            // argumentArray -> [argument,...]
            // argument -> {name: "名前", type: "種類"}
            // type -> {type: "入力", inputType: "文字"}
            //         {type: "入力", inputType: "数字", option: {min: 任意の数字, max: 任意の数字, step: 任意の数字}}
            //         {type: "入力", inputType: "配列", option: {struct: []}}
            //         {type: "入力", inputType: "ベクトル", option: {axis: [横軸の名前,縦軸の名前]}
            //         {type: "選択", choices: [選択肢0 : {text: "表示名", value: "値"},...]}
            const createEvent = (tag, index, option = "text", array = this.targetObject) => {
                tag.addEventListener("change", () => {
                    array[index] = option == "number" ? Number(tag.value) : tag.value;
                })
            }
            for (let argumentIndex = 0; argumentIndex < argumentArray.length; argumentIndex ++) {
                const argument = argumentArray[argumentIndex];
                const argumentType = argument.type;
                if (argumentType.type == "ボタン") {
                    const button = document.createElement("button");
                    button.textContent = argument.name;
                    button.addEventListener("click", () => {
                        const resource = argumentType.eventFn;
                        if (typeof resource === 'function') {
                            // resource(...this.submitArgumentArray);
                            resource();
                        } else if (resource.object && resource.targetFn) {
                            // resource.object[resource.targetFn](...this.submitArgumentArray);
                            resource.object[resource.targetFn]();
                        } else {
                            console.warn("関数が見つかりません", resource);
                        }
                    })
                    this.DOM.append(button);
                } else if (argumentType.type == "スイッチ") {
                    const switchDOM = createCheckbox("button-checkbox", argument.name);
                    const checkbox = switchDOM.inputDOM;
                    checkbox.checked = this.targetObject[argumentIndex];
                    checkbox.addEventListener("change", () => {
                        this.targetObject[argumentIndex] = checkbox.checked;
                    });
                    this.DOM.append(switchDOM);
                } else if (argumentType.type == "入力") {
                    const inputType = argumentType.inputType;
                    if (inputType == "文字") {
                        const input = createLabeledInput(this.DOM, argument.name, "text");
                        input.value = this.targetObject[argumentIndex];
                        createEvent(input, argumentIndex);
                    } else if (inputType == "数字") {
                        const input = createLabeledInput(this.DOM, argument.name, "number");
                        input.value = this.targetObject[argumentIndex];
                        if (argumentType.option) {
                            setNumberInputOption(input, argumentType.option);
                        }
                        createEvent(input, argumentIndex, "number");
                    } else if (inputType == "ベクトル") {
                        const vec = this.targetObject[argumentIndex];
                        const {container: container, axis0: inputForAxis0, axis1: inputForAxis1} = createLabeledVecInput(this.DOM, container,argumentType.option.axis);
                        createEvent(inputForAxis0, 0, "number", vec);
                        createEvent(inputForAxis1, 1, "number", vec);
                        if (isNumber(argumentType.option.initValue)) {
                            inputForAxis0.value = vec[0];
                            inputForAxis1.value = vec[1];
                        }
                    }
                } else if (argumentType.type == "選択") {
                    const select = createLabeledSelect(this.DOM, argument.name);
                    for (const item of argumentType.choices) {
                        if (IsString(item)) {
                            const option = document.createElement("option");
                            option.textContent = item;
                            option.value = item;
                            if (item == this.targetObject[argumentIndex]) {
                                option.selected = true;
                            }
                            select.append(option);
                        } else if (isPlainObject(item)) {
                            const option = document.createElement("option");
                            option.textContent = item.text;
                            option.value = item.value;
                            if (item.value == this.targetObject[argumentIndex]) {
                                option.selected = true;
                            }
                            select.append(option);
                        }
                    }
                    createEvent(select, argumentIndex);
                }
            }
        }
    }
}