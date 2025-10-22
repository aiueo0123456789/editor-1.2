import { app } from "../../../main.js";
import { InputManager } from "../../app/inputManager/inputManager.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { BoneExtrudeMoveCommand } from "../../commands/bone/bone.js";

export class ExtrudeMove {
    constructor(operator) {
        this.operator = operator;
        this.values = [0,0];
        this.sumMovement = [0,0];
        this.modal = {
            inputObject: {"value": this.values},
            DOM: [
                {tagType: "div", class: "shelfe", children: [
                    {tagType: "title", text: "ExtrudeMove", class: "shelfeTitle"},
                    {tagType: "input", label: "x", value: "value/0", type: "number", min: -1000, max: 1000, useCommand: false},
                    {tagType: "input", label: "y", value: "value/1", type: "number", min: -1000, max: 1000, useCommand: false},
                ]}
            ]
        };
        this.activateKey = "e";

        const update = () => {
            this.command.extrudeMove(this.values);
        }

        managerForDOMs.set({o: this.values}, update)
    }

    execute() {
        app.operator.execute();
    }

    init() {
        this.command = new BoneExtrudeMoveCommand();
        app.operator.appendCommand(this.command);
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

    mousedown(/** @type {InputManager} */inputManager) {
        return {complete: true};
    }
}