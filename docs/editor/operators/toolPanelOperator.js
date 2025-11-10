import { app } from "../../main.js";
import { InputManager } from "../app/inputManager/inputManager.js";
import { CreatorForUI } from "../utils/ui/creatorForUI.js";
import { createTag } from "../utils/ui/util.js";
import { isFunction } from "../utils/utility.js";

export class ToolPanelOperator {
    constructor(dom, panels) {
        this.dom = createTag(dom, "div", {style: "width: 100%; height: 100%; position: absolute; pointerEvents: none;"});
        this.state = 0;
        this.panels = panels;
        this.nowPanel = null;
        this.creatorForUI = new CreatorForUI();
    }

    changePanels(newPanels) {
        this.panels = newPanels;
    }

    reset() {
        this.state = 0;
        this.nowPanel = null;
        if (this.dom) {
            console.log("削除")
            this.creatorForUI.remove();
        }
    }

    async setPanel(model, /** @type {InputManager} */inputManager) {
        if (this.nowPanel) {
            await this.nowPanel.execute();
            this.reset();
        }
        this.nowPanel = new model(inputManager);
        if (this.dom) {
            this.creatorForUI.remove();
            if (this.nowPanel.modal) {
                this.creatorForUI.shelfeCreate(this.dom, this.nowPanel.modal);
            }
        }
        if (isFunction(this.nowPanel.init)) {
            const consumed = await this.nowPanel.init(inputManager);
            if (consumed) {
                if (consumed.complete) {
                    this.state ++;
                }
                return true;
            }
        }
    }

    async keyInput(/** @type {InputManager} */inputManager) {
        if (this.nowPanel && this.state == 0) {
            if (app.input.consumeKeys([this.nowPanel.activateKey])) {
                this.state ++;
            } else {
                if (isFunction(this.nowPanel.update)) {
                    await this.nowPanel.update(inputManager);
                }
            }
        } else {
            for (const key in this.panels) {
                if (app.input.consumeKeys([key])) {
                    await this.setPanel(this.panels[key], inputManager);
                }
            }
        }
    }

    async mousemove(/** @type {InputManager} */inputManager) {
        if (!this.state == 0) return ;
        if (this.nowPanel) {
            if (isFunction(this.nowPanel.mousemove)) {
                const consumed = await this.nowPanel.mousemove(inputManager);
                if (consumed) {
                    if (consumed.complete) {
                        this.state ++;
                    }
                    return true;
                }
            }
        }
        return false;
    }
    async mousedown(/** @type {InputManager} */inputManager) {
        if (this.state == 1) {
            await this.nowPanel.execute();
            this.reset();
            return true;
        }
        if (this.nowPanel) {
            if (isFunction(this.nowPanel.mousedown)) {
                const consumed = await this.nowPanel.mousedown(inputManager);
                if (consumed) {
                    if (consumed.complete) {
                        this.state ++;
                    }
                    return true;
                }
            }
        }
        return false;
    }
    async mouseup(/** @type {InputManager} */inputManager) {
        if (this.nowPanel) {
            if (isFunction(this.nowPanel.mouseup)) {
                const consumed = await this.nowPanel.mouseup(inputManager);
                if (consumed) {
                    if (consumed.complete) {
                        this.state ++;
                    }
                    return true;
                }
            }
        }
        return false;
    }
}