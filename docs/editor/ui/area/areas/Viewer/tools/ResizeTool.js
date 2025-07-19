import { app } from "../../../../../app/app.js";
import { InputManager } from "../../../../../app/inputManager/inputManager.js";
import { managerForDOMs } from "../../../../../utils/ui/util.js";
import { ResizeCommand } from "../../../../../operators/transform/transform.js";
import { ModalOperator } from "../../../../../utils/ui/modalOperator.js";
import { vec2 } from "../../../../../utils/mathVec.js";

export class ResizeModal {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.command = null;
        this.startPosition = [0,0];
        this.values = [
            0,0, // スライド量
            app.appConfig.areasConfig["Viewer"].proportionalEditType, // proportionalEditType
            app.appConfig.areasConfig["Viewer"].proportionalSize // proportionalSize
        ];
        this.modal = {
            inputObject: {"value": this.values},
            DOM: [
                {type: "div", class: "shelfe", children: [
                    {type: "title", text: "ResizeModal", class: "shelfeTitle"},
                    {type: "input", label: "x", withObject: "value/0", options: {type: "number",min: -1000, max: 1000}, custom: {visual: "1"}},
                    {type: "input", label: "y", withObject: "value/1", options: {type: "number",min: -1000, max: 1000}, custom: {visual: "1"}},
                    {type: "input", label: "スムーズ", withObject: "value/2", options: {type: "number",min: 0, max: 2}},
                    {type: "input", label: "半径", withObject: "value/3", options: {type: "number",min: 0, max: 10000}},
                ]}
            ]
        };
        this.activateKey = "g";

        const update = () => {
            this.command.update([this.values[0],this.values[1]], "ローカル", this.values[2], this.values[3]);
        }
        managerForDOMs.set({o: this.values, g: "_", i: "0"}, null, update, null);
        managerForDOMs.set({o: this.values, g: "_", i: "1"}, null, update, null);
        managerForDOMs.set({o: this.values, g: "_", i: "2"}, null, update, null);
        managerForDOMs.set({o: this.values, g: "_", i: "3"}, null, update, null);
    }

    async init(/** @type {InputManager} */inputManager) {
        this.startPosition = [...inputManager.position];
        const type = app.scene.state.currentMode;
        try {
            if (type == "メッシュ編集") {
                this.command = new ResizeCommand(type,app.scene.state.getSelectVertices());
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices.buffer, app.scene.runtimeData.graphicMeshData.selectedVertices.buffer);
            } else if (type == "メッシュ頂点アニメーション編集") {
                this.command = new ResizeCommand(type, app.scene.state.getSelectVertices(), {targetAnimation: app.scene.state.activeObject.animationBlock.activeAnimation});
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices.buffer, app.scene.runtimeData.graphicMeshData.selectedVertices.buffer);
            } else if (type == "ボーン編集") {
                this.command = new ResizeCommand(type,app.scene.state.getSelectVertices());
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.armatureData.renderingVertices.buffer, app.scene.runtimeData.armatureData.selectedVertices.buffer);
            } else if (type == "ベジェ編集") {
                this.command = new ResizeCommand(type,app.scene.state.getSelectVertices());
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices.buffer, app.scene.runtimeData.bezierModifierData.selectedVertices.buffer);
            } else if (type == "ベジェ頂点アニメーション編集") {
                this.command = new ResizeCommand(type, app.scene.state.getSelectVertices(), {targetAnimation: app.scene.state.activeObject.animationBlock.activeAnimation});
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices.buffer, app.scene.runtimeData.bezierModifierData.selectedVertices.buffer);
            } else if (type == "ボーンアニメーション編集") {
                this.command = new ResizeCommand(type,app.scene.state.getSelectBone());
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
        // this.values[0] += inputManager.position[0];
        // this.values[1] += inputManager.position[1];
        vec2.div(this.values, vec2.subR(inputManager.position, this.center), vec2.subR(this.startPosition, this.center));
        managerForDOMs.update(this.values);
        return true;
    }

    mousedown(/** @type {InputManager} */inputManager) {
        app.operator.appendCommand(this.command);
        app.operator.execute();
        return {complete: true};
    }
}