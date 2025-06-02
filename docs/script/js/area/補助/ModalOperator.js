import { InputManager } from "../../app/InputManager.js";
import { createTag } from "../../UI/制御.js";
import { CreatorForUI } from "./UIの自動生成.js";

export class ModalOperator {
    constructor(dom, modals) {
        this.dom = createTag(dom, "div", {style: "width: 100%; height: 100%; position: absolute; pointerEvents: none;"});
        this.modals = modals;
        this.nowModal = null;
        this.creatorForUI = new CreatorForUI();
    }

    execute() {
        this.nowModal = null;
    }

    setModal(model) {
        this.nowModal = new model(this);
        this.nowModal.init();
        this.creatorForUI.remove();
        if (this.nowModal.modal) {
            this.creatorForUI.create(this.dom, this.nowModal.modal, {padding: false});
        }
    }

    keyInput(/** @type {InputManager} */inputManager) {
        if (this.nowModal) {
            if (inputManager.consumeKeys([this.nowModal.activateKey])) {
                this.nowModal.command.execute();
                this.nowModal = null;
            } else {
                this.nowModal.update(inputManager);
            }
        } else {
            for (const key in this.modals) {
                if (inputManager.consumeKeys([key])) {
                    this.setModal(this.modals[key]);
                }
            }
        }
    }

    mousemove(/** @type {InputManager} */inputManager) {
        if (this.nowModal) {
            this.nowModal.mousemove?.(inputManager);
            return true;
        }
        return false;
    }
    mousedown(/** @type {InputManager} */inputManager) {
        if (this.nowModal) {
            this.nowModal.mousedown?.(inputManager);
            return true;
        }
        return false;
    }
}