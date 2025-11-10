import { app } from "../../../main.js";
import { InputManager } from "../../app/inputManager/inputManager.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { KeyframeTranslateCommand } from "../../commands/animation/keyframeTransform.js";

export class KeyframeTranslate {
    constructor(/** @type {InputManager} */inputManager) {
        this.command = null;
        this.values = [
            0,0, // スライド量
            // app.appConfig.areasConfig["Viewer"].proportionalMetaData.use, // useProportionalEdit
            // app.appConfig.areasConfig["Viewer"].proportionalMetaData.type, // proportionalType
            // app.appConfig.areasConfig["Viewer"].proportionalMetaData.size // proportionalSize
        ];
        this.sumMovement = [0,0];
        this.modal = {
            inputObject: {"value": this.values},
            DOM: [
                {tagType: "div", class: "shelfe", children: [
                    {tagType: "title", text: "TranslateModal", class: "shelfeTitle"},
                    {tagType: "input", label: "x", value: "value/0", type: "number", min: -1000, max: 1000, useCommand: false},
                    {tagType: "input", label: "y", value: "value/1", type: "number", min: -1000, max: 1000, useCommand: false},
                    // {tagType: "input", label: "プロポーショナル編集", type: "checkbox", checked: "value/2", look: {check: "check", uncheck: "uncheck"}, useCommand: false},
                    // {tagType: "select", label: "種類", value: "value/3", sourceObject: ["リニア", "逆二乗", "一定"], options: {initValue: {path: "value/4"}}, useCommand: false},
                    // {tagType: "input", label: "半径", value: "value/4", type: "number", min: 0, max: 10000, useCommand: false},
                ]}
            ]
        };
        this.activateKey = "g";
        this.type = "";

        const update = () => {
            if (!this.command) return ;
            // this.command.transform([this.values[0],this.values[1]], this.values[2], this.values[3], this.values[4]);
            this.command.transform([this.values[0],this.values[1]]);
        }
        managerForDOMs.set({o: this.values, i: "&all"}, update, null);
    }

    init() {
        this.type = app.context.currentMode;
        try {
            this.command = new KeyframeTranslateCommand();
            app.operator.appendCommand(this.command);
        } catch (error) {
            console.error(error);
            return {complete: true};
        }
    }

    mousemove(/** @type {InputManager} */inputManager) {
        this.sumMovement[0] += inputManager.movement[0];
        this.sumMovement[1] += inputManager.movement[1];
        if (app.input.keysDown["y"]) {
            this.values[0] = 0;
            this.values[1] = this.sumMovement[1];
        } else if (app.input.keysDown["x"]) {
            this.values[0] = this.sumMovement[0];
            this.values[1] = 0;
        } else {
            this.values[0] = this.sumMovement[0];
            this.values[1] = this.sumMovement[1];
        }
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