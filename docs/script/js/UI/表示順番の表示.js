import { app } from '../app.js';
import { stateMachine } from '../main.js';
import { activeOrClear } from '../コンテキストメニュー/制御.js';
import { changeObjectName } from '../app/Hierarchy.js';
import { createCheckbox, managerForDOMs } from './制御.js';
import { changeParameter } from './utility.js';

function updateObject(object, groupID, DOM) {
    /** @type {HTMLElement} */
    const container = DOM.querySelector("div");

    const nameInputTag = container.querySelector("input[type=text]");
    if (nameInputTag.value != object.name) nameInputTag.value = object.name;
    if (object.type == "グラフィックメッシュ") {
        const zIndexInputTag = container.querySelector("input[type=number]");
        if (zIndexInputTag.value != object.zIndex) zIndexInputTag.value = object.zIndex;
    }
}

function updateRenderingOrder(objects, groupID, DOM) {
    /** @type {HTMLElement} */
    const ul = DOM;
    ul.replaceChildren();
    for (const object of app.scene.renderingOrder) {
        let listItem = managerForDOMs.getDOMInObjectAndGroupID(object, groupID);

        if (!listItem) {
            listItem = document.createElement("li");
            const tagsGroup = document.createElement("div");
            tagsGroup.className = "hierarchy";

            const nameInputTag = document.createElement("input");
            nameInputTag.type = "text";
            nameInputTag.value = object.name;
            nameInputTag.setAttribute('readonly', true);
            nameInputTag.classList.add("dblClickInput");

            const typeImgTag = document.createElement("img");
            typeImgTag.src = `config/画像データ/${object.type}.png`;

            const depthAndNameDiv = document.createElement("div");
            depthAndNameDiv.className = "hierarchy-name";
            depthAndNameDiv.append(nameInputTag, typeImgTag);

            const zIndexInput = document.createElement("input");
            zIndexInput.className = "hierarchy-zIndex";
            zIndexInput.type = "number";
            zIndexInput.min = 0;
            zIndexInput.max = 1000;
            zIndexInput.step = 1;
            zIndexInput.value = object.zIndex;

            const hideCheckTag = createCheckbox();
            hideCheckTag.classList.add("hierarchy-hide");
            hideCheckTag.inputDOM.checked = object.visible;

            tagsGroup.append(depthAndNameDiv, zIndexInput, hideCheckTag);

            zIndexInput.addEventListener('change', () => {
                changeParameter(object, "zIndex", Number(zIndexInput.value));
            });

            hideCheckTag.inputDOM.addEventListener('change', () => {
                object.visible = hideCheckTag.inputDOM.checked;
            });

            tagsGroup.addEventListener('click', () => {
                stateMachine.externalInputs["ヒエラルキーのオブジェクト選択"] = object;
            });

            nameInputTag.addEventListener('dblclick', () => {
                nameInputTag.removeAttribute('readonly');
                nameInputTag.focus();
            });

            nameInputTag.addEventListener('blur', () => {
                changeObjectName(object, nameInputTag.value);
                nameInputTag.setAttribute('readonly', true);
            });

            listItem.append(tagsGroup);

            managerForDOMs.set(object, groupID, listItem, updateObject);
        }
        activeOrClear(listItem.querySelector("div"), stateMachine.state.data.activeObject == object);
        ul.append(listItem);
    }
}

export function displayRenderingOrder(targetTag, groupID) {
    targetTag.replaceChildren();

    const scrollable = document.createElement("ul");
    scrollable.classList.add("scrollable","color2");

    targetTag.append(scrollable);

    managerForDOMs.set("表示順番", groupID, scrollable, updateRenderingOrder);
    managerForDOMs.update("表示順番", groupID)
}