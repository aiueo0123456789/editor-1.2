import { app } from "../../../../../app/app.js";
import { InputManager } from "../../../../../app/inputManager/inputManager.js";
import { ModalOperator } from "../../../../../utils/ui/modalOperator.js";
import { managerForDOMs } from "../../../../../utils/ui/util.js";
import { GPU } from "../../../../../utils/webGPU.js";
import { KeyTranslateCommand } from "../../../../../operators/keyTransform/keyTransform.js";

class Modal {
    constructor() {
    }
}

export class KeyRotate {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
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
        if (type == "メッシュ編集") {
            this.command = new RotateCommand(app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.runtimeData.graphicMeshData.selectedVertices));
            this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices, app.scene.runtimeData.graphicMeshData.selectedVertices);
        } else if (type == "頂点アニメーション編集") {
            // this.command = new TranslateCommand(app.scene.state.selectedObject);
        } else if (type == "ボーン編集") {
            this.command = new RotateCommand(app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.runtimeData.armatureData.selectedVertices));
            this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.armatureData.renderingVertices, app.scene.runtimeData.armatureData.selectedVertices);
        } else if (type == "ベジェ編集") {
            this.command = new RotateCommand(app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.runtimeData.bezierModifierData.selectedVertices.buffer));
            this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices.buffer, app.scene.runtimeData.bezierModifierData.selectedVertices.buffer);
        }
        this.command.setCenterPoint(this.center);
    }

    async mousemove(/** @type {InputManager} */inputManager) {
        // console.log(inputManager)
        this.values[0] += vec2.getAngularVelocity(this.center,inputManager.lastPosition,inputManager.movement);
        // console.log(this.values)
        this.update();
    }

    mousedown(/** @type {InputManager} */inputManager) {
        this.operator.execute();
        return {complete: true};
    }

    update() {
        this.command.update(this.values[0], "ローカル", this.values[1], this.values[2]);
    }
}