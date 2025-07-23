import { app } from "../../../../../app/app.js";
import { InputManager } from "../../../../../app/inputManager/inputManager.js";
import { managerForDOMs } from "../../../../../utils/ui/util.js";
import { RotateCommand } from "../../../../../commands/transform/transform.js";
import { vec2 } from "../../../../../utils/mathVec.js";
import { ModalOperator } from "../../../../../operators/modalOperator.js";

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
        this.type = app.scene.state.currentMode;
        try {
            if (this.type == "メッシュ編集") {
                this.command = new RotateCommand(this.type,app.scene.state.getSelectVertices());
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices.buffer, app.scene.runtimeData.graphicMeshData.selectedVertices.buffer);
            } else if (this.type == "メッシュ頂点アニメーション編集") {
                this.command = new RotateCommand(this.type, app.scene.state.getSelectVertices(), {targetAnimation: app.scene.state.activeObject.animationBlock.activeAnimation});
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices.buffer, app.scene.runtimeData.graphicMeshData.selectedVertices.buffer);
            } else if (this.type == "ボーン編集") {
                this.command = new RotateCommand(this.type,app.scene.state.getSelectVertices());
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.armatureData.renderingVertices.buffer, app.scene.runtimeData.armatureData.selectedVertices.buffer);
            } else if (this.type == "ベジェ編集") {
                this.command = new RotateCommand(this.type,app.scene.state.getSelectVertices());
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices.buffer, app.scene.runtimeData.bezierModifierData.selectedVertices.buffer);
            } else if (this.type == "ベジェ頂点アニメーション編集") {
                this.command = new RotateCommand(this.type, app.scene.state.getSelectVertices(), {targetAnimation: app.scene.state.activeObject.animationBlock.activeAnimation});
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices.buffer, app.scene.runtimeData.bezierModifierData.selectedVertices.buffer);
            } else if (this.type == "ボーンアニメーション編集") {
                this.command = new RotateCommand(this.type,app.scene.state.getSelectBone());
                this.center = await app.scene.getSelectBonesCenter(app.scene.runtimeData.armatureData.renderingVertices.buffer, app.scene.runtimeData.armatureData.selectedBones.buffer);
            }
            this.command.setCenterPoint(this.center);
            managerForDOMs.update(this.values);
        } catch (error) {
            console.error(error)
            return {complete: true};
        }
    }

    async mousemove(/** @type {InputManager} */inputManager) {
        // console.log(inputManager)
        if (this.type == "ボーンアニメーション編集") {
            console.log(this.type)
            this.values[0] += vec2.getAngularVelocity(this.center,inputManager.lastPosition,inputManager.movement);
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