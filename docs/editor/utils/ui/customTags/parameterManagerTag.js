import { app } from "../../../../main.js";
import { changeParameter } from "../../utility.js";
import { CreatorForUI, ParameterReference } from "../creatorForUI.js";
import { CustomTag } from "../customTag.js";
import { createTag } from "../util.js";

export class ParameterManagerTag extends CustomTag {
    constructor(/** @type {CreatorForUI} */ creatorForUI,t,parent,searchTarget,child,flag) {
        super();
        /** @type {HTMLElement} */
        this.element = createTag(t, "div", {class: "button"});
        /** @type {HTMLElement} */
        this.icon = createTag(this.element, "img");
        this.element.addEventListener("click", (e) => {
            const rect = this.element.getBoundingClientRect();
            /** @type {HTMLElement} */
            const ul = app.ui.creatorForUI.getDOMFromID("parameterManagerSelecter");
            ul.style.left = `${rect.left}px`;
            ul.style.top = `${rect.top + 15}px`;
            ul.replaceChildren();
            ul.classList.remove("hidden");
            for (const parameterManager of app.scene.objects.parameterManagers) {
                const li = createTag(ul, "div", {textContent: parameterManager.name});
                li.addEventListener("click", () => {
                    child.targets.forEach((targetPath, index) => {
                        /** @type {ParameterReference} */
                        const reference = creatorForUI.getParameter(searchTarget, targetPath, 1);
                        changeParameter(reference.object, reference.parameter, parameterManager.parameters[index].value);
                    });
                })
            }

            function removeFn() {
                ul.replaceChildren();
                ul.classList.add("hidden");
                document.removeEventListener("click", removeFn); // ドキュメントからイベントリスナーを削除
            }
            document.addEventListener("click", removeFn); // セレクト以外がクリックされたら(ドキュメント)非表示
            e.stopPropagation();
        });
        this.dataBlocks = [];
    }
}