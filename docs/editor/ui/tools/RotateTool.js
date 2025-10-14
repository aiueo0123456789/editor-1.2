import { app } from "../../../main.js";
import { InputManager } from "../../app/inputManager/inputManager.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { RotateCommand } from "../../commands/transform/transform.js";
import { mathVec2 } from "../../utils/mathVec.js";
import { ModalOperator } from "../../operators/modalOperator.js";

export class RotateModal {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.command = null;
        this.values = [
            0, // 回転量
            app.appConfig.areasConfig["Viewer"].proportionalEditType, // proportionalEditType
            app.appConfig.areasConfig["Viewer"].proportionalSize // proportionalSize
        ];
        this.modal = {
            inputObject: {"value": this.values},
            DOM: [
                {tagType: "div", class: "shelfe", children: [
                    {tagType: "title", text: "TranslateModal", class: "shelfeTitle"},
                    {tagType: "input", label: "回転量", value: "value/0", type: "number",min: -1000, max: 1000, custom: {visual: "1"}},
                    {tagType: "input", label: "スムーズ", value: "value/2", type: "number",min: 0, max: 2},
                    {tagType: "input", label: "半径", value: "value/3", type: "number",min: 0, max: 10000},
                ]}
            ]
        };
        this.activateKey = "r";
        this.center = [0,0];
        this.type = "";

        const update = () => {
            if (!this.command) return ;
            this.command.update(this.values[0], "ローカル", this.values[1], this.values[2]);
        }
        managerForDOMs.set({o: this.values, g: "_", i: "&all"}, update, null);
    }

    async init() {
        this.type = app.context.currentMode;
        try {
            if (this.type == "メッシュ編集") {
                this.command = new RotateCommand(this.type,app.context.selectVertices);
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices.buffer, app.scene.runtimeData.graphicMeshData.selectedVertices.buffer);
            } else if (this.type == "メッシュ頂点アニメーション編集") {
                this.command = new RotateCommand(this.type, app.context.selectVertices, {targetAnimation: app.context.activeObject.animationBlock.activeAnimation});
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices.buffer, app.scene.runtimeData.graphicMeshData.selectedVertices.buffer);
            } else if (this.type == "ボーン編集") {
                this.command = new RotateCommand(this.type,app.context.selectVertices);
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.armatureData.renderingVertices.buffer, app.scene.runtimeData.armatureData.selectedVertices.buffer);
            } else if (this.type == "ベジェ編集") {
                this.command = new RotateCommand(this.type,app.context.selectVertices);
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices.buffer, app.scene.runtimeData.bezierModifierData.selectedVertices.buffer);
            } else if (this.type == "ベジェ頂点アニメーション編集") {
                this.command = new RotateCommand(this.type, app.context.selectVertices);
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices.buffer, app.scene.runtimeData.bezierModifierData.selectedVertices.buffer);
            } else if (this.type == "ボーンアニメーション編集") {
                this.command = new RotateCommand(this.type,app.context.getSelectBones);
                this.center = await app.scene.getSelectBonesCenter(app.scene.runtimeData.armatureData.renderingVertices.buffer, app.scene.runtimeData.armatureData.selectedBones.buffer);
            }
            this.command.setCenterPoint(this.center);
            app.operator.appendCommand(this.command);
        } catch (error) {
            console.error(error)
            return {complete: true};
        }
    }

    async mousemove(/** @type {InputManager} */inputManager) {
        // console.log(inputManager)
        if (this.type == "ボーンアニメーション編集") {
            console.log(this.type)
            this.values[0] += mathVec2.getAngularVelocity(this.center,inputManager.lastPosition,inputManager.movement);
        } else {
            this.values[0] += mathVec2.getAngularVelocity(this.center,inputManager.lastPosition,inputManager.movement);
        }
        managerForDOMs.update({o: this.values});
        return true;
    }

    execute() {
        app.operator.execute();
    }

    mousedown(/** @type {InputManager} */inputManager) {
        return {complete: true};
    }
}