import { app } from "../../../app.js";
import { InputManager } from "../../../app/InputManager.js";
import { GPU } from "../../../webGPU.js";
import { vec2 } from "../../../ベクトル計算.js";
import { RotateCommand } from "../../../機能/オペレーター/変形/トランスフォーム.js";
import { ModalOperator } from "../../補助/ModalOperator.js";

class Modal {
    constructor() {
    }
}

export class RotateModal {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.command = null;
        this.values = [
            0, // 回転量
            0, // proportionalEditType
            0 // proportionalSize
        ];
        this.modal = new Modal();
        this.activateKey = "r";
        this.center = [0,0];
    }

    async init() {
        if (app.scene.state.currentMode == "メッシュ編集") {
            this.center = await app.scene.getSelectVerticesCenter(app.scene.gpuData.graphicMeshData.rendering, app.scene.gpuData.graphicMeshData.selectedVertices);
            console.log(this.center);
            this.command = new RotateCommand(app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.gpuData.graphicMeshData.selectedVertices));
            this.command.setCenterPoint(this.center);
        } else if (app.scene.state.currentMode == "頂点アニメーション編集") {
            // this.command = new TranslateCommand(app.scene.state.selectedObject);
        }
    }

    async mousemove(/** @type {InputManager} */inputManager) {
        // console.log(inputManager)
        this.values[0] += vec2.getAngularVelocity(this.center,inputManager.lastPosition,inputManager.movement);
        console.log(this.values)
        this.update();
    }

    mousedown(/** @type {InputManager} */inputManager) {
        this.operator.execute();
    }

    update() {
        this.command.update(this.values[0], "ローカル", this.values[1], this.values[2]);
    }
}