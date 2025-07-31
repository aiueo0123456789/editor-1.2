import { app } from "../app/app.js";
import { InputManager } from "../app/inputManager/inputManager.js";
import { CreatorForUI } from "../utils/ui/creatorForUI.js";
import { createTag } from "../utils/ui/util.js";
import { isFunction } from "../utils/utility.js";

export class ModalOperator {
    constructor(dom, modals) {
        this.dom = createTag(dom, "div", {style: "width: 100%; height: 100%; position: absolute; pointerEvents: none;"});
        this.state = 0;
        this.modals = modals;
        this.nowModal = null;
        this.creatorForUI = new CreatorForUI();
    }

    reset() {
        this.state = 0;
        this.nowModal = null;
        if (this.dom) {
            console.log("削除")
            this.creatorForUI.remove();
        }
    }

    async setModal(model, /** @type {InputManager} */inputManager) {
        if (this.nowModal) {
            this.nowModal.execute();
            this.reset();
        }
        this.nowModal = new model(this);
        if (this.dom) {
            console.log(this.nowModal);
            this.creatorForUI.remove();
            if (this.nowModal.modal) {
                console.log(this.nowModal);
                this.creatorForUI.shelfeCreate(this.dom, this.nowModal.modal);
            }
        }
        if (isFunction(this.nowModal.init)) {
            const consumed = await this.nowModal.init(inputManager);
            if (consumed) {
                if (consumed.complete) {
                    this.state ++;
                }
                return true;
            }
        }
    }

    async keyInput(/** @type {InputManager} */inputManager) {
        if (this.nowModal && this.state == 0) {
            if (app.input.consumeKeys([this.nowModal.activateKey])) {
                this.state ++;
            } else {
                if (isFunction(this.nowModal.update)) {
                    this.nowModal.update(inputManager);
                }
            }
        } else {
            for (const key in this.modals) {
                if (app.input.consumeKeys([key])) {
                    this.setModal(this.modals[key], inputManager);
                }
            }
        }
    }

    async mousemove(/** @type {InputManager} */inputManager) {
        if (!this.state == 0) return ;
        if (this.nowModal) {
            if (isFunction(this.nowModal.mousemove)) {
                const consumed = await this.nowModal.mousemove(inputManager);
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
            this.nowModal.execute();
            this.reset();
            return true;
        }
        if (this.nowModal) {
            if (isFunction(this.nowModal.mousedown)) {
                const consumed = await this.nowModal.mousedown(inputManager);
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
        if (this.nowModal) {
            if (isFunction(this.nowModal.mouseup)) {
                const consumed = await this.nowModal.mouseup(inputManager);
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