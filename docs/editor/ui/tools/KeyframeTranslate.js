import { KeyframeTranslateCommand } from "../../commands/keyframeTransform/keyframeTransform.js";
import { app } from "../../../main.js";
import { InputManager } from "../../app/inputManager/inputManager.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { ModalOperator } from "../../operators/modalOperator.js";

export class KeyframeTranslate {
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
                {tagType: "div", class: "shelfe", children: [
                    {tagType: "title", text: "TlanslateeModal", class: "shelfeTitle"},
                    {tagType: "input", label: "x", value: "value/0", type: "number",min: -1000, max: 1000, custom: {visual: "1"}},
                    {tagType: "input", label: "y", value: "value/1", type: "number",min: -1000, max: 1000, custom: {visual: "1"}},
                    {tagType: "input", label: "スムーズ", value: "value/2", type: "number",min: 0, max: 2},
                    {tagType: "input", label: "半径", value: "value/3", type: "number",min: 0, max: 10000},
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
        this.command = new KeyframeTranslateCommand(app.appConfig.areasConfig["Timeline"].selectVertices);
        this.center = app.appConfig.areasConfig["Timeline"].getSelectVerticesCenter();
        this.command.setCenterPoint(this.center);
        app.operator.appendCommand(this.command);
    }

    execute() {
        app.operator.execute();
    }

    mousemove(/** @type {InputManager} */inputManager) {
        this.values[0] += inputManager.movement[0];
        this.values[1] += inputManager.movement[1];
        managerForDOMs.update(this.values);
        return true;
    }

    mousedown(/** @type {InputManager} */inputManager) {
        return {complete: true};
    }
}