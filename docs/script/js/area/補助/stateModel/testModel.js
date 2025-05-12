import { app } from "../../../app";
import { keysDown } from "../../../main";

export class testModel {
    constructor() {
        this.subState = [];
    }

    update() {
        if (app.scene.state.currentMode == "オブジェクト") {
            if (keysDown["g"]) {

            }
        }
    }
}