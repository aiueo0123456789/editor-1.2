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

    setPanel(model, /** @type {InputManager} */inputManager) {
        if (this.nowPanel) {
            this.nowPanel.execute();
            this.reset();
        }
        this.nowPanel = new model(this);
        if (this.dom) {
            console.log(this.nowPanel);
            this.creatorForUI.remove();
            if (this.nowPanel.modal) {
                console.log(this.nowPanel);
                this.creatorForUI.shelfeCreate(this.dom, this.nowPanel.modal);
            }
        }
        if (isFunction(this.nowPanel.init)) {
            const consumed = this.nowPanel.init(inputManager);
            if (consumed) {
                if (consumed.complete) {
                    this.state ++;
                }
                return true;
            }
        }
    }

    keyInput(/** @type {InputManager} */inputManager) {
        if (this.nowPanel && this.state == 0) {
            if (app.input.consumeKeys([this.nowPanel.activateKey])) {
                this.state ++;
            } else {
                if (isFunction(this.nowPanel.update)) {
                    this.nowPanel.update(inputManager);
                }
            }
        } else {
            for (const key in this.panels) {
                if (app.input.consumeKeys([key])) {
                    this.setPanel(this.panels[key], inputManager);
                }
            }
        }
    }

    mousemove(/** @type {InputManager} */inputManager) {
        if (!this.state == 0) return ;
        if (this.nowPanel) {
            if (isFunction(this.nowPanel.mousemove)) {
                const consumed = this.nowPanel.mousemove(inputManager);
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
    mousedown(/** @type {InputManager} */inputManager) {
        if (this.state == 1) {
            this.nowPanel.execute();
            this.reset();
            return true;
        }
        if (this.nowPanel) {
            if (isFunction(this.nowPanel.mousedown)) {
                const consumed = this.nowPanel.mousedown(inputManager);
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
    mouseup(/** @type {InputManager} */inputManager) {
        if (this.nowPanel) {
            if (isFunction(this.nowPanel.mouseup)) {
                const consumed = this.nowPanel.mouseup(inputManager);
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