import { app } from "../../app/app.js";
import { InputManager } from "../../app/inputManager/inputManager.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { TranslateCommand } from "../../commands/transform/transform.js";
import { ModalOperator } from "../../operators/modalOperator.js";

export class TranslateModal {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.command = null;
        this.values = [
            0,0, // スライド量
            app.appConfig.areasConfig["Viewer"].proportionalEditType, // proportionalEditType
            app.appConfig.areasConfig["Viewer"].proportionalSize // proportionalSize
        ];
        this.sumMovement = [0,0];
        this.modal = {
            inputObject: {"value": this.values},
            DOM: [
                {type: "div", class: "shelfe", children: [
                    {type: "title", text: "TranslateModal", class: "shelfeTitle"},
                    {type: "input", label: "x", withObject: "value/0", options: {type: "number",min: -1000, max: 1000}, custom: {visual: "1"}},
                    {type: "input", label: "y", withObject: "value/1", options: {type: "number",min: -1000, max: 1000}, custom: {visual: "1"}},
                    {type: "input", label: "スムーズ", withObject: "value/2", options: {type: "number",min: 0, max: 2}},
                    {type: "input", label: "半径", withObject: "value/3", options: {type: "number",min: 0, max: 10000}},
                ]}
            ]
        };
        this.activateKey = "g";
        this.type = "";

        const update = () => {
            if (!this.command) return ;
            this.command.update([this.values[0],this.values[1]], "ローカル", this.values[2], this.values[3]);
        }
        managerForDOMs.set({o: this.values, g: "_", i: "&all"}, null, update, null);
    }

    async init() {
        this.type = app.scene.state.currentMode;
        try {
            if (this.type == "メッシュ編集") {
                this.command = new TranslateCommand(this.type,app.scene.state.getSelectVertices());
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices.buffer, app.scene.runtimeData.graphicMeshData.selectedVertices.buffer);
            } else if (this.type == "メッシュ頂点アニメーション編集") {
                this.command = new TranslateCommand(this.type, app.scene.state.getSelectVertices(), {targetAnimation: app.scene.state.activeObject.animationBlock.activeAnimation});
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices.buffer, app.scene.runtimeData.graphicMeshData.selectedVertices.buffer);
            } else if (this.type == "ボーン編集") {
                this.command = new TranslateCommand(this.type,app.scene.state.getSelectVertices());
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.armatureData.renderingVertices.buffer, app.scene.runtimeData.armatureData.selectedVertices.buffer);
            } else if (this.type == "ベジェ編集") {
                this.command = new TranslateCommand(this.type,app.scene.state.getSelectVertices());
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices.buffer, app.scene.runtimeData.bezierModifierData.selectedVertices.buffer);
            } else if (this.type == "ベジェ頂点アニメーション編集") {
                this.command = new TranslateCommand(this.type, app.scene.state.getSelectVertices(), {targetAnimation: app.scene.state.activeObject.animationBlock.activeAnimation});
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices.buffer, app.scene.runtimeData.bezierModifierData.selectedVertices.buffer);
            } else if (this.type == "ボーンアニメーション編集") {
                this.command = new TranslateCommand(this.type,app.scene.state.getSelectBone());
                this.center = await app.scene.getSelectBonesCenter(app.scene.runtimeData.armatureData.renderingVertices.buffer, app.scene.runtimeData.armatureData.selectedBones.buffer);
            }
            this.command.setCenterPoint(this.center);
            managerForDOMs.update(this.values);
        } catch (error) {
            console.error(error)
            return {complete: true};
        }
    }

    mousemove(/** @type {InputManager} */inputManager) {
        this.sumMovement[0] += inputManager.movement[0];
        this.sumMovement[1] += inputManager.movement[1];
        if (app.input.keysDown["y"]) {
            this.values[0] = 0;
            this.values[1] = this.sumMovement[1];
        } else if (app.input.keysDown["x"]) {
            this.values[0] = this.sumMovement[0];
            this.values[1] = 0;
        } else {
            this.values[0] = this.sumMovement[0];
            this.values[1] = this.sumMovement[1];
        }
        managerForDOMs.update(this.values);
        return true;
    }

    execute() {
        app.operator.appendCommand(this.command);
        app.operator.execute();
    }

    mousedown(/** @type {InputManager} */inputManager) {
        return {complete: true};
    }
}