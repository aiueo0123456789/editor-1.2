import { KeyframeResizeCommand } from "../../commands/animation/keyframeTransform.js";
import { app } from "../../../main.js";
import { InputManager } from "../../app/inputManager/inputManager.js";
import { managerForDOMs } from "../../utils/ui/util.js";

export class KeyframeResize {
    constructor(/** @type {InputManager} */inputManager) {
        this.command = null;
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

        const update = () => {
            this.command.update([this.values[0],this.values[1]], "ローカル", this.values[2], this.values[3]);
        }
        managerForDOMs.set({o: this.values, g: "_", i: "0"}, update, null);
        managerForDOMs.set({o: this.values, g: "_", i: "1"}, update, null);
        managerForDOMs.set({o: this.values, g: "_", i: "2"}, update, null);
        managerForDOMs.set({o: this.values, g: "_", i: "3"}, update, null);
    }

    async init() {
        this.command = new KeyframeResizeCommand(app.appConfig.areasConfig["Timeline"].getSelectVertices);
        this.center = app.appConfig.areasConfig["Timeline"].getSelectVerticesCenter();
        this.command.setCenterPoint(this.center);
        app.operator.appendCommand(this.command);
    }

    execute() {
        this.operator.execute();
        return {complete: true};
    }

    mousemove(/** @type {InputManager} */inputManager) {
        this.values[0] += inputManager.movement[0];
        this.values[1] += inputManager.movement[1];
        managerForDOMs.update({o: this.values});
    }
}