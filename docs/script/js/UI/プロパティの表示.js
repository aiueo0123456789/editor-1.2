import { keysDown, renderObjectManager } from "../main.js";
import { hexToRgba } from "../utility.js";
import { activeOrClear } from "../コンテキストメニュー/制御.js";
import { changeObjectName, hierarchy } from "../ヒエラルキー.js";
import { updateAnimationManagerList } from "./アニメーションマネージャーの表示.js";
import { createIcon, createLabeledInput, createMinList, createSection, managerForDOMs } from "./制御.js";

function updateMaskTexture(object, groupID, DOM) {
}

function updateMaskTextureList(object, groupID, DOM) {
    const maskTextureList = DOM;

    for (const maskTexture of object) { // オブジェクトのアニメーションたちを表示
        let listItem = null;
        for (const dom of maskTextureList.children) {
            if (dom.dataset.objectID == maskTexture.id) {
                listItem = dom;
                break ;
            }
        }
        if (!listItem) {
            listItem = document.createElement("li");
            listItem.dataset.objectID = maskTexture.id;
            listItem.dataset.selected = "false";
            listItem.classList.add("flex-gap10px");

            createIcon(listItem, "マスク");

            const nameInputTag = document.createElement("input");
            nameInputTag.type = "text";
            nameInputTag.value = maskTexture.name;
            nameInputTag.classList.add("dblClickInput");
            nameInputTag.setAttribute('readonly', true);
            nameInputTag.addEventListener('dblclick', () => {
                nameInputTag.removeAttribute('readonly');
                nameInputTag.focus();
            });

            nameInputTag.addEventListener('blur', () => {
                changeObjectName(maskTexture, nameInputTag.value);
                nameInputTag.setAttribute('readonly', true);
            });

            listItem.addEventListener("click", () => {
                if (keysDown["Shift"]) {
                    listItem.dataset.selected = "true";
                } else {
                    for (const dom of maskTextureList.children) {
                        if (dom.dataset.objectID == maskTexture.id) {
                            dom.dataset.selected = "true";
                        } else {
                            dom.dataset.selected = "false";
                        }
                    }
                }
                managerForDOMs.update(object);
            })
            listItem.append(nameInputTag);

            maskTextureList.appendChild(listItem);

            managerForDOMs.set(maskTexture, groupID, listItem, updateMaskTexture);
        }
        activeOrClear(listItem, listItem.dataset.selected === "true");
    }
}

export function displayProperty(scrollableDiv, groupID) {
    scrollableDiv.innerHTML = "";
    scrollableDiv.className = "";
    scrollableDiv.classList.add("grid-main","scrollable","gap-2px","color3","pa-10px","pa-r-0px");

    if (true) {
        const worldSection = document.createElement("div");
        worldSection.classList.add("section");

        const backgroundColorInput = createLabeledInput(worldSection, "背景色", "color");
        backgroundColorInput.value = "#FFFFFF";

        backgroundColorInput.addEventListener("change", () => {
            renderObjectManager.backgroundColor = hexToRgba(backgroundColorInput.value, 1);
        });

        const maskTextureDataSection = document.createElement("div");
        maskTextureDataSection.classList.add("section");

        const maskTextureListObject = createMinList(maskTextureDataSection, "マスクテクスチャ");
        maskTextureListObject.appendButton.addEventListener("click", () => {
            renderObjectManager.appendMaskTexture("名称未設定");
        });

        maskTextureListObject.deleteButton.addEventListener("click", () => {
            for (let i = maskTextureListObject.list.children.length - 1; i >= 0; i --) {
                const dom = maskTextureListObject.list.children[i];
                if (dom.dataset.selected === "true") {
                    renderObjectManager.deleteMaskTextureFromID(dom.dataset.objectID);
                }
            }
        });

        managerForDOMs.set(renderObjectManager.maskTextures, groupID, maskTextureListObject.list, updateMaskTextureList);
        managerForDOMs.update(renderObjectManager.maskTextures);

        createLabeledInput(maskTextureDataSection, "名前", "text");
        createLabeledInput(maskTextureDataSection, "テスト", "number");
        createSection(worldSection, "テクスチャ", maskTextureDataSection);

        createSection(scrollableDiv, "ワールド", worldSection);
    }

    if (true) {
        const animationManagerSection = document.createElement("div");
        animationManagerSection.classList.add("section");

        const maskTextureListObject = createMinList(animationManagerSection, "アニメーションマネージャー");
        maskTextureListObject.appendButton.addEventListener("click", () => {
            hierarchy.addEmptyObject("アニメーションマネージャー");
        });

        maskTextureListObject.deleteButton.addEventListener("click", () => {
            for (let i = maskTextureListObject.list.children.length - 1; i >= 0; i --) {
                const dom = maskTextureListObject.list.children[i];
                if (dom.dataset.selected === "true") {
                    renderObjectManager.deleteMaskTextureFromID(dom.dataset.objectID);
                }
            }
        });

        managerForDOMs.set(hierarchy.animationManagers, groupID, maskTextureListObject.list, updateAnimationManagerList);
        managerForDOMs.update(hierarchy.animationManagers);

        createLabeledInput(animationManagerSection, "名前", "text");
        createLabeledInput(animationManagerSection, "テスト", "number");

        createSection(scrollableDiv, "アニメーションマネージャー", animationManagerSection);
    }
}