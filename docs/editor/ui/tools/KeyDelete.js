import { app } from "../../../main.js";

export class KeyDelete {
    constructor(/** @type {InputManager} */inputManager) {
        this.selectKeys = app.appConfig.areasConfig["Timeline"].getSelectKey();
        this.activateKey = "x";
    }

    init() {
        return {complete: true};
    }

    execute() {
        this.selectKeys.forEach((key) => {
            key.keyframeBlock.deleteKeyframe(key);
        })
    }
}