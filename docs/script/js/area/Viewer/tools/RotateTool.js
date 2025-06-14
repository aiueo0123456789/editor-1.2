import { app } from "../../../app.js";
import { InputManager } from "../../../app/InputManager.js";
import { GPU } from "../../../webGPU.js";
import { vec2 } from "../../../ベクトル計算.js";
import { RotateCommand } from "../../../機能/オペレーター/変形/トランスフォーム.js";
import { ModalOperator } from "../../補助/ModalOperator.js";

export class RotateModal {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.command = null;
        this.values = [
            0, // 回転量
            app.appConfig.areasConfig["Viewer"].proportionalEditType, // proportionalEditType
            app.appConfig.areasConfig["Viewer"].proportionalSize // proportionalSize
        ];
        this.modal = null;
        this.activateKey = "r";
        this.center = [0,0];
    }

    async init(type) {
        if (type == "メッシュ編集") {
            this.command = new RotateCommand(type,app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.gpuData.graphicMeshData.selectedVertices));
            this.center = await app.scene.getSelectVerticesCenter(app.scene.gpuData.graphicMeshData.renderingVertices, app.scene.gpuData.graphicMeshData.selectedVertices);
        } else if (type == "頂点アニメーション編集") {
            // this.command = new TranslateCommand(app.scene.state.selectedObject);
        } else if (type == "ボーン編集") {
            this.command = new RotateCommand(type,app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.gpuData.boneModifierData.selectedVertices));
            this.center = await app.scene.getSelectVerticesCenter(app.scene.gpuData.boneModifierData.renderingVertices, app.scene.gpuData.boneModifierData.selectedVertices);
        } else if (type == "ベジェ編集") {
            this.command = new RotateCommand(type,app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.gpuData.bezierModifierData.selectedVertices));
            this.center = await app.scene.getSelectVerticesCenter(app.scene.gpuData.bezierModifierData.renderingVertices, app.scene.gpuData.bezierModifierData.selectedVertices);
        } else if (type == "ボーンアニメーション編集") {
            this.command = new RotateCommand(type, app.scene.gpuData.boneModifierData.getSelectBone());
            // this.center = await app.scene.getSelectRootBoneCenter(app.scene.gpuData);
            this.center = [0,0];
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
    }

    update() {
        this.command.update(this.values[0], "ローカル", this.values[1], this.values[2]);
    }
}