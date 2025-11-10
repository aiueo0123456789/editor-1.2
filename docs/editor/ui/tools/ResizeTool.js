import { app } from "../../../main.js";
import { InputManager } from "../../app/inputManager/inputManager.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { ResizeCommand } from "../../commands/transform/transform.js";
import { MathVec2 } from "../../utils/mathVec.js";

export class ResizeModal {
    constructor(/** @type {InputManager} */inputManager) {
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
                {tagType: "div", class: "shelfe", children: [
                    {tagType: "title", text: "ResizeModal", class: "shelfeTitle"},
                    {tagType: "input", label: "x", value: "value/0", type: "number",min: -1000, max: 1000},
                    {tagType: "input", label: "y", value: "value/1", type: "number",min: -1000, max: 1000},
                    {tagType: "input", label: "スムーズ", value: "value/2", type: "number",min: 0, max: 2},
                    {tagType: "input", label: "半径", value: "value/3", type: "number",min: 0, max: 10000},
                ]}
            ]
        };
        this.activateKey = "g";
        this.type = "";

        const update = () => {
            this.command.update([this.values[0],this.values[1]], "ローカル", this.values[2], this.values[3]);
        }
        managerForDOMs.set({o: this.values, g: "_", i: "&all"}, update, null);
    }

    async init(/** @type {InputManager} */inputManager) {
        this.startPosition = [...inputManager.position];
        this.type = app.context.currentMode;
        try {
            if (this.type == "メッシュ編集") {
                this.command = new ResizeCommand(this.type,app.context.selectVertices);
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices.buffer, app.scene.runtimeData.graphicMeshData.selectedVertices.buffer);
            } else if (this.type == "メッシュシェイプキー編集") {
                this.command = new ResizeCommand(this.type, app.context.getSelselectVerticesectVertices, {targetAnimation: app.context.activeObject.animationBlock.activeAnimation});
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.graphicMeshData.renderingVertices.buffer, app.scene.runtimeData.graphicMeshData.selectedVertices.buffer);
            } else if (this.type == "ボーン編集") {
                this.command = new ResizeCommand(this.type,app.context.selectVertices);
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.armatureData.renderingVertices.buffer, app.scene.runtimeData.armatureData.selectedVertices.buffer);
            } else if (this.type == "ベジェ編集") {
                this.command = new ResizeCommand(this.type,app.context.selectVertices);
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices.buffer, app.scene.runtimeData.bezierModifierData.selectedVertices.buffer);
            } else if (this.type == "ベジェ頂点アニメーション編集") {
                this.command = new ResizeCommand(this.type, app.context.selectVertices);
                this.center = await app.scene.getSelectVerticesCenter(app.scene.runtimeData.bezierModifierData.renderingVertices.buffer, app.scene.runtimeData.bezierModifierData.selectedVertices.buffer);
            } else if (this.type == "ボーンアニメーション編集") {
                this.command = new ResizeCommand(this.type,app.context.getSelectBones);
                this.center = await app.scene.getSelectBonesCenter(app.scene.runtimeData.armatureData.renderingVertices.buffer, app.scene.runtimeData.armatureData.selectedBones.buffer);
            }
            this.command.setCenterPoint(this.center);
            app.operator.appendCommand(this.command);
        } catch (error) {
            console.error(error)
            return {complete: true};
        }
    }

    mousemove(/** @type {InputManager} */inputManager) {
        // this.values[0] += inputManager.position[0];
        // this.values[1] += inputManager.position[1];
        MathVec2.div(this.values, MathVec2.subR(inputManager.position, this.center), MathVec2.subR(this.startPosition, this.center));
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