import { createID, createTag, managerForDOMs, setClass } from "../utils/ui/util.js";
import { CreatorForUI } from "../utils/ui/creatorForUI.js";

export class ToolsBarOperator {
    constructor(/** @type {HTMLElement} */dom, shelfes) {
        this.shelfes = shelfes;
        this.id = createID();
        this.creatorForUI = new CreatorForUI();
        /** @type {HTMLElement} */
        this.dom = createTag(dom, "div", {style: "width: 100%; height: 100%; position: absolute; pointerEvents: none; display: grid; gridTemplateColumns: 1fr auto;"});
        /** @type {HTMLElement} */
        this.domForMain = createTag(this.dom, "div", {style: "width: 100%; height: 100%; pointerEvents: none; overflow-y: auto;"});
        /** @type {HTMLElement} */
        this.domForSideBar = createTag(this.dom, "div", {style: "width: 20px; height: 100%; overflow-y: auto; pointerEvents: all;"});
        setClass(this.domForSideBar, "sideBar");
        this.update();
        this.nowModal = null;
    }

    changeShelfes(newShelfes) {
        this.shelfes = newShelfes;
        this.update();
    }

    update() {
        this.domForMain.replaceChildren();
        this.domForSideBar.replaceChildren();
        this.creatorForUI.remove();
        for (const shelfeName in this.shelfes) {
            // 横
            this.creatorForUI.createFromChildren(this.domForSideBar,null,[
                {tagType: "div", children: [
                    {tagType: "div", options: {textContent: shelfeName}, style: "writingMode: vertical-rl;"},
                ], class: "sideBar-toolTitle"}
            ], {});
            // パネル
            const panel = new this.shelfes[shelfeName];
            if (!panel.creatorForUI) {
                panel.creatorForUI = new CreatorForUI();
            }
            panel.creatorForUI.shelfeCreate(this.domForMain, panel.struct);
        }
    }
}