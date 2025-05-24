import { InputManager } from "../../app/InputManager.js";

export class ModalOperator {
    constructor(modals) {
        this.modals = modals;
        this.nowModal = null;
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
                    this.nowModal = this.modals[key];
                    this.nowModal.init();
                }
            }
        }
    }

    mouseMove(/** @type {InputManager} */inputManager) {
        if (this.nowModal) {
            this.nowModal.mouseMove?.(inputManager);
        }
    }
}