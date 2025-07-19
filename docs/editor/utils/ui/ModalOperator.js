import { app } from "../../app/app.js";
import { InputManager } from "../../app/inputManager/inputManager.js";
import { isFunction } from "../utility.js";
import { CreatorForUI } from "./creatorForUI.js";
import { createTag } from "./util.js";

export class ModalOperator {
    constructor(dom, modals) {
        this.dom = createTag(dom, "div", {style: "width: 100%; height: 100%; position: absolute; pointerEvents: none;"});
        this.modals = modals;
        this.nowModal = null;
        this.creatorForUI = new CreatorForUI();
    }

    reset() {
        this.nowModal = null;
        if (this.dom) {
            console.log("削除")
            this.creatorForUI.remove();
        }
    }

    async setModal(model, /** @type {InputManager} */inputManager) {
        this.nowModal = new model(this);
        const consumed = await this.nowModal?.init(inputManager);
        if (consumed) {
            if (consumed.complete) {
                this.reset();
            }
            return true;
        }
        if (this.dom) {
            this.creatorForUI.remove();
            if (this.nowModal.modal) {
                this.creatorForUI.shelfeCreate(this.dom, this.nowModal.modal);
            }
        }
    }

    async keyInput(/** @type {InputManager} */inputManager) {
        if (this.nowModal) {
            if (app.input.consumeKeys([this.nowModal.activateKey])) {
                // this.nowModal.command.execute();
                app.operator.appendCommand(this.nowModal.command);
                app.operator.execute();
                this.nowModal = null;
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
        if (this.nowModal) {
            const consumed = await this.nowModal?.mousemove(inputManager);
            if (consumed) {
                if (consumed.complete) {
                    this.reset();
                }
                return true;
            }
        }
        return false;
    }
    async mousedown(/** @type {InputManager} */inputManager) {
        if (this.nowModal) {
            const consumed = await this.nowModal?.mousedown(inputManager);
            if (consumed) {
                if (consumed.complete) {
                    this.reset();
                }
                return true;
            }
        }
        return false;
    }
    async mouseup(/** @type {InputManager} */inputManager) {
        if (this.nowModal) {
            const consumed = await this.nowModal?.mouseup(inputManager);
            if (consumed) {
                if (consumed.complete) {
                    this.reset();
                }
                return true;
            }
        }
        return false;
    }
}