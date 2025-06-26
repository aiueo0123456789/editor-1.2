import { app } from "../../app.js";
import { InputManager } from "../../app/InputManager.js";
import { createTag } from "../../UI/制御.js";
import { isFunction } from "../../utility.js";
import { CreatorForUI } from "./UIの自動生成.js";

export class ModalOperator {
    constructor(dom, modals) {
        if (dom) {
            this.dom = createTag(dom, "div", {style: "width: 100%; height: 100%; position: absolute; pointerEvents: none;"});
        } else {
            this.dom = null;
        }
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

    async setModal(model) {
        this.nowModal = new model(this);
        const consumed = await this.nowModal?.init(app.scene.state.currentMode);
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
            if (inputManager.consumeKeys([this.nowModal.activateKey])) {
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
                if (inputManager.consumeKeys([key])) {
                    this.setModal(this.modals[key]);
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