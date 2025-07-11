import { app } from "../../../app.js";
import { InputManager } from "../../../app/InputManager.js";
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
        this.type = "";
    }

    async init() {
        const type = app.scene.state.currentMode;
        try {
            this.type = type;
            if (type == "メッシュ編集") {
                this.command = new RotateCommand(type,app.scene.state.getSelectVertices());
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices, app.scene.runtimeData.graphicMeshData.selectedVertices);
            } else if (type == "メッシュ頂点アニメーション編集") {
                this.command = new RotateCommand(type, app.scene.state.getSelectVertices(), {targetAnimation: app.scene.state.activeObject.animationBlock.activeAnimation});
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices, app.scene.runtimeData.graphicMeshData.selectedVertices);
            } else if (type == "ボーン編集") {
                this.command = new RotateCommand(type,app.scene.state.getSelectVertices());
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.armatureData.renderingVertices, app.scene.runtimeData.armatureData.selectedVertices);
            } else if (type == "ベジェ編集") {
                this.command = new RotateCommand(type,app.scene.state.getSelectVertices());
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices.buffer, app.scene.runtimeData.bezierModifierData.selectedVertices.buffer);
            } else if (type == "ベジェ頂点アニメーション編集") {
                this.command = new RotateCommand(type, app.scene.state.getSelectVertices(), {targetAnimation: app.scene.state.activeObject.animationBlock.activeAnimation});
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices.buffer, app.scene.runtimeData.bezierModifierData.selectedVertices.buffer);
            } else if (type == "ボーンアニメーション編集") {
                this.command = new RotateCommand(type,app.scene.state.getSelectBone());
                this.center = await app.scene.getSelectBonesCenter(app.scene.runtimeData.armatureData.renderingVertices, app.scene.runtimeData.armatureData.selectedBones);
            }
            this.command.setCenterPoint(this.center);
        } catch (error) {
            return {complete: true};
        }
    }

    async mousemove(/** @type {InputManager} */inputManager) {
        // console.log(inputManager)
        if (this.type == "ボーンアニメーション編集") {
            this.values[0] -= vec2.getAngularVelocity(this.center,inputManager.lastPosition,inputManager.movement);
        } else {
            this.values[0] += vec2.getAngularVelocity(this.center,inputManager.lastPosition,inputManager.movement);
        }
        // console.log(this.values)
        this.update();
        return true;
    }

    mousedown(/** @type {InputManager} */inputManager) {
        app.operator.appendCommand(this.command);
        app.operator.execute();
        return {complete: true};
    }

    update() {
        this.command.update(this.values[0], "ローカル", this.values[1], this.values[2]);
    }
}