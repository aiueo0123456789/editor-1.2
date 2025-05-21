import { app } from "../../../app.js";
import { GPU } from "../../../webGPU.js";
import { TranslateCommand } from "../../../機能/オペレーター/変形/トランスフォーム.js";

export class VerticesTranslateModal {
    constructor() {
        this.command = null;
        this.modalStruct = [
            {type: ""}
        ];
        this.activateKey = "g";
    }

    async init() {
        if (app.scene.state.currentMode == "メッシュ編集") {
            this.command = new TranslateCommand(app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.gpuData.graphicMeshData.selectedVertices));
        } else if (app.scene.state.currentMode == "頂点アニメーション編集") {
            // this.command = new TranslateCommand(app.scene.state.selectedObject);
        }
    }

    update() {
    }
}