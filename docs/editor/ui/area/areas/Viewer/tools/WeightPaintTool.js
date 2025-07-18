import { app } from "../../../app.js";
import { InputManager } from "../../../app/InputManager.js";
import { managerForDOMs } from "../../../UI/制御.js";
import { WeightPaintCommand } from "../../../機能/オペレーター/メッシュ/ウェイトペイント.js";
import { ModalOperator } from "../../補助/ModalOperator.js";

export class WeightPaintModal {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        console.log(app.appConfig.areasConfig["Viewer"].weightPaintMetaData)
        this.command = new WeightPaintCommand(app.scene.state.activeObject, app.appConfig.areasConfig["Viewer"].weightPaintMetaData.boneIndex, app.appConfig.areasConfig["Viewer"].weightPaintMetaData.weightValue, 1, app.appConfig.areasConfig["Viewer"].weightPaintMetaData.paintSize, app.appConfig.areasConfig["Viewer"].weightPaintMetaData.bezierType);
        this.values = [
            0,0, // スライド量
        ];
        this.modal = {
            inputObject: {"value": this.values},
            DOM: [
                {type: "div", class: "shelfe", children: [
                    {type: "title", text: "PainteModal", class: "shelfeTitle"},
                    {type: "input", label: "x", withObject: "value/0", options: {type: "number",min: -1000, max: 1000}, custom: {visual: "1"}},
                    {type: "input", label: "y", withObject: "value/1", options: {type: "number",min: -1000, max: 1000}, custom: {visual: "1"}},
                ]}
            ]
        };
        this.activateKey = "mouseup";

        const update = () => {
            this.command.update([this.values[0],this.values[1]]);
        }
        managerForDOMs.set({o: this.values, g: "_", i: "0"}, null, update, null);
        managerForDOMs.set({o: this.values, g: "_", i: "1"}, null, update, null);
    }

    async init(type) {
    }

    mousemove(/** @type {InputManager} */inputManager) {
        this.values[0] = inputManager.position[0];
        this.values[1] = inputManager.position[1];
        managerForDOMs.update(this.values);
        return true;
    }

    mousedown() {
        
    }

    mouseup(/** @type {InputManager} */inputManager) {
        app.operator.appendCommand(this.command);
        app.operator.execute();
        return {complete: true};
    }
}