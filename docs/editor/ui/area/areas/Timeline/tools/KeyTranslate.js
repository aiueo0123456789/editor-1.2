import { app } from "../../../../../app/app.js";
import { InputManager } from "../../../../../app/inputManager/inputManager.js";
import { managerForDOMs } from "../../../../../utils/ui/util.js";
import { KeyTranslateCommand } from "../../../../../commands/keyTransform/keyTransform.js";
import { ModalOperator } from "../../../../../operators/modalOperator.js";

export class KeyTranslate {
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
                    {type: "title", text: "TlanslateeModal", class: "shelfeTitle"},
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
        this.command = new KeyTranslateCommand(app.appConfig.areasConfig["Timeline"].getSelectVertices());
        this.center = app.appConfig.areasConfig["Timeline"].getSelectVerticesCenter();
        this.command.setCenterPoint(this.center);
    }

    mousemove(/** @type {InputManager} */inputManager) {
        this.values[0] += inputManager.movement[0];
        this.values[1] += inputManager.movement[1];
        managerForDOMs.update(this.values);
        return true;
    }

    mousedown(/** @type {InputManager} */inputManager) {
        app.operator.appendCommand(this.command);
        app.operator.execute();
        return {complete: true};
    }
}