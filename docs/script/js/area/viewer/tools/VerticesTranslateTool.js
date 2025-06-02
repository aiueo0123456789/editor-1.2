import { app } from "../../../app.js";
import { InputManager } from "../../../app/InputManager.js";
import { managerForDOMs } from "../../../UI/制御.js";
import { GPU } from "../../../webGPU.js";
import { TranslateCommand } from "../../../機能/オペレーター/変形/トランスフォーム.js";
import { ModalOperator } from "../../補助/ModalOperator.js";

export class VerticesTranslateModal {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.command = null;
        this.values = [
            0,0, // スライド量
            0, // proportionalEditType
            0 // proportionalSize
        ];
        this.modal = {
            inputObject: {"value": this.values},
            struct: {
                DOM: [
                    {type: "div", class: "shelfe", children: [
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
            this.command.update([this.values[0],this.values[1]], "ローカル", this.values[2], this.values[3]);
        }
        managerForDOMs.set(this.values, "_", null, update, null, "0");
        managerForDOMs.set(this.values, "_", null, update, null, "1");
        managerForDOMs.set(this.values, "_", null, update, null, "2");
        managerForDOMs.set(this.values, "_", null, update, null, "3");
    }

    async init() {
        if (app.scene.state.currentMode == "メッシュ編集") {
            console.log(await GPU.getSelectIndexFromBufferBit(app.scene.gpuData.graphicMeshData.selectedVertices))
            this.command = new TranslateCommand(app.scene.state.selectedObject, await GPU.getSelectIndexFromBufferBit(app.scene.gpuData.graphicMeshData.selectedVertices));
        } else if (app.scene.state.currentMode == "頂点アニメーション編集") {
            // this.command = new TranslateCommand(app.scene.state.selectedObject);
        }
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