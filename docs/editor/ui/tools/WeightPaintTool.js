import { app } from "../../../main.js";
import { InputManager } from "../../app/inputManager/inputManager.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { WeightPaintCommand } from "../../commands/mesh/weightPaint.js";

export class WeightPaintModal {
    constructor(/** @type {InputManager} */inputManager) {
        console.log(app.appConfig.areasConfig["Viewer"].weightPaintMetaData)
        this.command = new WeightPaintCommand(inputManager.position);
        this.values = [
            ...inputManager.position // スライド量
        ];
        this.modal = {
            inputObject: {"value": this.values},
            DOM: [
                {tagType: "div", class: "shelfe", children: [
                    {tagType: "title", text: "PainteModal", class: "shelfeTitle"},
                    {tagType: "input", label: "x", value: "value/0", type: "number",min: -1000, max: 1000, custom: {visual: "1"}},
                    {tagType: "input", label: "y", value: "value/1", type: "number",min: -1000, max: 1000, custom: {visual: "1"}},
                ]}
            ]
        };
        this.activateKey = "mouseup";

        const update = () => {
            this.command.update([this.values[0],this.values[1]]);
        }
        managerForDOMs.set({o: this.values, g: "_", i: "0"}, update, null);
        managerForDOMs.set({o: this.values, g: "_", i: "1"}, update, null);
    }

    async init(type) {
    }

    mousemove(/** @type {InputManager} */inputManager) {
        this.values[0] = inputManager.position[0];
        this.values[1] = inputManager.position[1];
        managerForDOMs.update({o: this.values});
        return true;
    }

    mousedown() {
    }

    execute() {
        app.operator.appendCommand(this.command);
        app.operator.execute();
    }

    mouseup(/** @type {InputManager} */inputManager) {
        return {complete: true};
    }
}