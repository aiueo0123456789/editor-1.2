import { createID, createTag, managerForDOMs, setClass } from "./util.js";
import { CreatorForUI } from "./creatorForUI.js";

export class ToolsBarOperator {
    constructor(/** @type {HTMLElement} */dom, modals) {
        this.creatorForUI = new CreatorForUI();
        /** @type {HTMLElement} */
        this.dom = createTag(dom, "div", {style: "width: 100%; height: 100%; position: absolute; pointerEvents: none; display: grid; gridTemplateColumns: 1fr auto;"});
        /** @type {HTMLElement} */
        this.domForMain = createTag(this.dom, "div", {style: "width: 100%; height: 100%; pointerEvents: none; overflow-y: auto;"});
        /** @type {HTMLElement} */
        this.domForSideBar = createTag(this.dom, "div", {style: "width: 20px; height: 100%; overflow-y: auto; pointerEvents: all;"});
        setClass(this.domForSideBar, "sideBar")
        const modalsUpdate = () => {
            this.domForMain.replaceChildren();
            this.domForSideBar.replaceChildren();
            this.creatorForUI.remove();
            const modalsInstance = modals.map(modal => new modal());
            for (const modal of modalsInstance) {
                this.creatorForUI.createFromChildren(this.domForSideBar,[
                    {type: "div", children: [
                        {type: "div", options: {textContent: modal.name}, style: "writingMode: vertical-rl;"},
                    ], class: "sideBar-toolTitle"}
                ], {});
            }
            for (const modal of modalsInstance) {
                if (!modal.creatorForUI) {
                    modal.creatorForUI = new CreatorForUI();
                }
                // const modalContainer = createTag(this.domForMain, "div", {style: "width: 100%; height: fit-content; pointerEvents: none;"});
                // modal.creatorForUI.shelfeCreate(modalContainer, modal.struct);
                modal.creatorForUI.shelfeCreate(this.domForMain, modal.struct);
            }
        }
        this.id = createID();
        managerForDOMs.set({o: modals, g: this.id}, null, modalsUpdate);
        managerForDOMs.updateGroupInObject(modals, this.id);
        this.nowModal = null;
    }
}