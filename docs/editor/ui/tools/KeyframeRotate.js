import { app } from "../../../main.js";
import { InputManager } from "../../app/inputManager/inputManager.js";

class Modal {
    constructor() {
    }
}

export class KeyframeRotate {
    constructor(/** @type {InputManager} */inputManager) {
        this.command = null;
        this.values = [
            0, // 回転量
            app.appConfig.areasConfig["Viewer"].proportionalEditType, // proportionalEditType
            app.appConfig.areasConfig["Viewer"].proportionalSize // proportionalSize
        ];
        this.modal = new Modal();
        this.activateKey = "r";
        this.center = [0,0];
    }

    async init() {
        this.command = new KeyTranslateCommand(app.appConfig.areasConfig["Timeline"].selectVertices);
        this.center = app.appConfig.areasConfig["Timeline"].getSelectVerticesCenter();
        this.command.setCenterPoint(this.center);
        app.operator.appendCommand(this.command);
    }

    execute() {
        app.operator.execute();
    }

    async mousemove(/** @type {InputManager} */inputManager) {
        // console.log(inputManager)
        this.values[0] += vec2.getAngularVelocity(this.center,inputManager.lastPosition,inputManager.movement);
        // console.log(this.values)
        this.update();
    }

    mousedown(/** @type {InputManager} */inputManager) {
        return {complete: true};
    }

    update() {
        this.command.update(this.values[0], "ローカル", this.values[1], this.values[2]);
    }
}