import { app } from "../app.js";
import { changeObjectName } from "../app/Hierarchy.js";
import { renderingParameters } from "../レンダリングパラメーター.js";
import { createCheckbox, createDoubleClickInput, createIcon, managerForDOMs, setRangeStyle } from "./制御.js";
import { CreatorForUI } from "../area/補助/UIの自動生成.js";
import { Inspector } from "./json/インスペクタ.js";

function updateAnimationCollectorWeight(object, groupID, DOM) {
    let slider = DOM.slider;
    let input = DOM.input;

    slider.value = object.weight;
    // slider.dispatchEvent(new Event("input", { bubbles: true, detail: { stopUpdateForUI: true }}));
    slider.dispatchEvent(new CustomEvent("input", {
        bubbles: true,
        detail: { stopUpdateForUI: true }
    }));
    input.value = object.weight;
}

function updateAnimationCollector(object, groupID, DOM) {
    /** @type {HTMLElement} */
    const containerDiv = DOM.querySelector("div");
    const name = containerDiv.querySelector('input[type="text"]');

    if (name.value != object.name) {
        name.value = object.name;
    }
}

function updateHasKeyCheckbox(object, groupID, DOM, others) {
    /** @type {HTMLElement} */
    const checkboxs = DOM;
    for (let i = 0; i < app.hierarchy.animationManagers.length; i ++) {
        checkboxs[i].checked = app.hierarchy.animationManagers[i].keyframe.hasKeyFromFrame(renderingParameters.keyfarameCount, 1);
    }
    // DOM.checked = true;
}

export function updateAnimationCollectorList(object, groupID, DOM) {
    /** @type {HTMLElement} */
    const ul = DOM;

    const hasKeyCheckboxs = [];

    for (const /** @type {AnimationCollector} */ animationManager of app.hierarchy.animationManagers) {
        let listItem = managerForDOMs.getDOMInObjectAndGroupID(animationManager, groupID);
        if (!listItem) {
            listItem = document.createElement("ul");
            const main = document.createElement("div");
            main.classList.add("animationManagerContainer");
            createIcon(main, "アニメーションコレクター");

            const name = createDoubleClickInput(changeObjectName, animationManager);

            name.value = animationManager.name;

            const weightSlider = document.createElement("input");
            weightSlider.style.width = "100%";
            weightSlider.type = "range";
            setRangeStyle(weightSlider);
            weightSlider.max = 1;
            weightSlider.min = 0;
            weightSlider.value = 0;
            weightSlider.step = 0.00001;

            const weightInput = document.createElement("input");
            weightInput.type = "number";
            weightInput.value = 0;
            weightSlider.max = 1;
            weightSlider.min = 0;
            weightSlider.step = 0.00001;

            weightSlider.addEventListener("input", (e) => {
                if (e.detail) {
                    if (!e.detail.stopUpdateForUI) {
                        animationManager.setWeight(Number(weightSlider.value));
                    }
                } else {
                    animationManager.setWeight(Number(weightSlider.value));
                }
            })

            weightInput.addEventListener("input", () => {
                animationManager.setWeight(Number(weightInput.value));
            })

            managerForDOMs.set(animationManager, groupID, {slider: weightSlider, input: weightInput}, updateAnimationCollectorWeight, null, "ウェイト");
            managerForDOMs.set(animationManager, groupID, listItem, updateAnimationCollector);

            const hasKeyCheckbox = createCheckbox();

            hasKeyCheckbox.inputDOM.addEventListener("change", () => {
                if (animationManager.keyframe.hasKeyFromFrame(renderingParameters.keyfarameCount, 1)) {
                    animationManager.keyframe.deleteKeyframe(animationManager.keyframe.getKeyFromFrame(renderingParameters.keyfarameCount, 1));
                } else {
                    animationManager.keyframe.addKeyframe(renderingParameters.keyfarameCount, animationManager.weight);
                }
            });

            main.append(name, weightSlider, weightInput, hasKeyCheckbox);
            const children = document.createElement("ul");
            children.classList.add("scrollable");
            listItem.append(main, children);
            ul.appendChild(listItem);
        }
        hasKeyCheckboxs.push(listItem.querySelector('[name="checkbox"]').inputDOM);
    }
    managerForDOMs.set("現在のフレーム", groupID, hasKeyCheckboxs, updateHasKeyCheckbox);
}


// const jsonData = await readJsonFile("./script/js/UI/json/ワールド.json");
export function displayAnimationCollector(targetDiv, groupID) {
    const UI_ = new Inspector();
    const ui = new CreatorForUI();
    ui.create(targetDiv,UI_.struct, UI_.inputObject);
}