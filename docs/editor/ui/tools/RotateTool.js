import { app } from "../../../main.js";
import { InputManager } from "../../app/inputManager/inputManager.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { RotateCommand } from "../../commands/transform/transform.js";
import { MathVec2 } from "../../utils/mathVec.js";

export class RotateModal {
    constructor(/** @type {InputManager} */inputManager) {
        this.command = null;
        this.values = [
            0,0, // 回転量, dummy
            app.appConfig.areasConfig["Viewer"].proportionalMetaData.use, // useProportionalEdit
            app.appConfig.areasConfig["Viewer"].proportionalMetaData.type, // proportionalType
            app.appConfig.areasConfig["Viewer"].proportionalMetaData.size // proportionalSize
        ];
        this.sumMovement = [0,0];
        this.modal = {
            inputObject: {"value": this.values},
            DOM: [
                {tagType: "div", class: "shelfe", children: [
                    {tagType: "title", text: "TranslateModal", class: "shelfeTitle"},
                    {tagType: "input", label: "回転量", value: "value/0", type: "number", min: -1000, max: 1000, useCommand: false, custom: {visual: "range"}},
                    {tagType: "input", label: "プロポーショナル編集", type: "checkbox", checked: "value/2", look: {check: "check", uncheck: "uncheck"}, useCommand: false},
                    {tagType: "select", label: "種類", value: "value/3", sourceObject: ["リニア", "逆二乗", "一定"], options: {initValue: {path: "value/4"}}, useCommand: false},
                    {tagType: "input", label: "半径", value: "value/4", type: "number", min: 0, max: 10000, useCommand: false, custom: {visual: "range"}},
                ]}
            ]
        };
        this.activateKey = "r";
        this.type = "";

        const update = () => {
            if (!this.command) return ;
            this.command.transform([this.values[0],this.values[1]], this.values[2], this.values[3], this.values[4]);
        }
        managerForDOMs.set({o: this.values, g: "_", i: "&all"}, update, null);
    }

    async init() {
        this.type = app.context.currentMode;
        try {
            this.command = new RotateCommand();
            app.operator.appendCommand(this.command);
        } catch (error) {
            console.error(error);
            return {complete: true};
        }
    }

    async mousemove(/** @type {InputManager} */inputManager) {
        // console.log(inputManager)
        this.values[0] += MathVec2.getAngularVelocity(this.command.pivotPoint, inputManager.lastPosition, inputManager.movement);
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