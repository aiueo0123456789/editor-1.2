import { app } from "../../../../../app/app.js";
import { InputManager } from "../../../../../app/inputManager/inputManager.js";
import { ModalOperator } from "../../../../../utils/ui/modalOperator.js";
import { managerForDOMs } from "../../../../../utils/ui/util.js";
import { GPU } from "../../../../../utils/webGPU.js";
import { KeyTranslateCommand } from "../../../../../operators/keyTransform/keyTransform.js";

export class KeyResize {
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

    async init() {
        if (type == "メッシュ編集") {
            this.command = new ResizeCommand(app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.runtimeData.graphicMeshData.selectedVertices));
            this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices, app.scene.runtimeData.graphicMeshData.selectedVertices);
        } else if (type == "頂点アニメーション編集") {
            // this.command = new TranslateCommand(app.scene.state.selectedObject);
        } else if (type == "ボーン編集") {
            this.command = new ResizeCommand(app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.runtimeData.armatureData.selectedVertices));
            this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.armatureData.renderingVertices, app.scene.runtimeData.armatureData.selectedVertices);
        } else if (type == "ベジェ編集") {
            this.command = new ResizeCommand(app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.runtimeData.bezierModifierData.selectedVertices.buffer));
            this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices.buffer, app.scene.runtimeData.bezierModifierData.selectedVertices.buffer);
        }
        this.command.setCenterPoint(this.center);
    }

    mousemove(/** @type {InputManager} */inputManager) {
        this.values[0] += inputManager.movement[0];
        this.values[1] += inputManager.movement[1];
        managerForDOMs.update(this.values);
    }

    mousedown(/** @type {InputManager} */inputManager) {
        this.operator.execute();
    }
}