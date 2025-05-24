import { app } from "../../../app.js";
import { InputManager } from "../../../app/InputManager.js";
import { GPU } from "../../../webGPU.js";
import { TranslateCommand } from "../../../機能/オペレーター/変形/トランスフォーム.js";

class Modal {
    constructor() {
    }
}

export class VerticesTranslateModal {
    constructor() {
        this.command = null;
        this.values = [
            0,0, // スライド量
            0, // proportionalEditType
            0 // proportionalSize
        ];
        this.modal = new Modal();
        this.activateKey = "g";
    }

    async init() {
        if (app.scene.state.currentMode == "メッシュ編集") {
            console.log(await GPU.getSelectIndexFromBufferBit(app.scene.gpuData.graphicMeshData.selectedVertices))
            this.command = new TranslateCommand(app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.gpuData.graphicMeshData.selectedVertices));
        } else if (app.scene.state.currentMode == "頂点アニメーション編集") {
            // this.command = new TranslateCommand(app.scene.state.selectedObject);
        }
    }

    mouseMove(/** @type {InputManager} */inputManager) {
        // console.log(inputManager)
        this.values[0] += inputManager.movement[0];
        this.values[1] += inputManager.movement[1];
        this.update();
    }

    update() {
        this.command.update([this.values[0],this.values[1]], "ローカル", this.values[2], this.values[3]);
    }
}