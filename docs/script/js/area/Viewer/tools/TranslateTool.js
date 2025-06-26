import { app } from "../../../app.js";
import { InputManager } from "../../../app/InputManager.js";
import { managerForDOMs } from "../../../UI/制御.js";
import { GPU } from "../../../webGPU.js";
import { TranslateCommand } from "../../../機能/オペレーター/変形/トランスフォーム.js";
import { ModalOperator } from "../../補助/ModalOperator.js";

export class TranslateModal {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.command = null;
        this.values = [
            0,0, // スライド量
            app.appConfig.areasConfig["Viewer"].proportionalEditType, // proportionalEditType
            app.appConfig.areasConfig["Viewer"].proportionalSize // proportionalSize
        ];
        this.modal = {
            inputObject: {"value": this.values},
            struct: {
                DOM: [
                    {type: "div", class: "shelfe", children: [
                        {type: "title", text: "TranslateModal", class: "shelfeTitle"},
                        {type: "input", label: "x", withObject: {object: "value", parameter: "0"}, options: {type: "number",min: -1000, max: 1000}, custom: {visual: "1"}},
                        {type: "input", label: "y", withObject: {object: "value", parameter: "1"}, options: {type: "number",min: -1000, max: 1000}, custom: {visual: "1"}},
                        {type: "input", label: "スムーズ", withObject: {object: "value", parameter: "2"}, options: {type: "number",min: 0, max: 2}},
                        {type: "input", label: "半径", withObject: {object: "value", parameter: "3"}, options: {type: "number",min: 0, max: 10000}},
                    ]}
                ]
            }
        };
        this.activateKey = "g";

        const update = () => {
            if (!this.command) return ;
            this.command.update([this.values[0],this.values[1]], "ローカル", this.values[2], this.values[3]);
        }
        managerForDOMs.set({o: this.values, g: "_", i: "0"}, null, update, null);
        managerForDOMs.set({o: this.values, g: "_", i: "1"}, null, update, null);
        managerForDOMs.set({o: this.values, g: "_", i: "2"}, null, update, null);
        managerForDOMs.set({o: this.values, g: "_", i: "3"}, null, update, null);
    }

    async init(type) {
        try {
            if (type == "メッシュ編集") {
                this.command = new TranslateCommand(type,app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.runtimeData.graphicMeshData.selectedVertices));
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices, app.scene.runtimeData.graphicMeshData.selectedVertices);
            } else if (type == "頂点アニメーション編集") {
                // this.command = new TranslateCommand(app.scene.state.selectedObject);
            } else if (type == "ボーン編集") {
                this.command = new TranslateCommand(type,app.scene.state.selectedObject, app.scene.runtimeData.armatureData.getSelectVerticesIndex());
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.armatureData.renderingVertices, app.scene.runtimeData.armatureData.selectedVertices);
            } else if (type == "ベジェ編集") {
                this.command = new TranslateCommand(type,app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.runtimeData.bezierModifierData.selectedVertices));
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices, app.scene.runtimeData.bezierModifierData.selectedVertices);
            } else if (type == "ボーンアニメーション編集") {
                this.command = new TranslateCommand(type,app.scene.runtimeData.armatureData.getSelectBone());
                this.center = await app.scene.getSelectBonesCenter(app.scene.runtimeData.armatureData.renderingVertices, app.scene.runtimeData.armatureData.selectedBones);
            }
            this.command.setCenterPoint(this.center);
            managerForDOMs.update(this.values);
        } catch (error) {
            return {complete: true};
        }
    }

    mousemove(/** @type {InputManager} */inputManager) {
        this.values[0] += inputManager.movement[0];
        this.values[1] += inputManager.movement[1];
        managerForDOMs.update(this.values);
        return true;
    }

    mousedown(/** @type {InputManager} */inputManager) {
        app.operator.appendCommand(this.command);
        app.operator.update();
        return {complete: true};
    }
}