import { app } from "../../../app";

export class testModel {
    constructor() {
        this.subState = [];
    }

    update() {
        if (app.scene.state.currentMode == "オブジェクト") {
            if (app.input.keysDown["g"]) {

            }
        }
    }
}