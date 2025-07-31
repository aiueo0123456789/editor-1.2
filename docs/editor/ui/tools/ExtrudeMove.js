import { app } from "../../app/app.js";
import { InputManager } from "../../app/inputManager/inputManager.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { BoneExtrudeMoveCommand } from "../../commands/bone/bone.js";

export class ExtrudeMove {
    constructor(operator) {
        this.operator = operator;
        this.targets = app.scene.runtimeData.armatureData.getSelectVerticesInBone();
        this.command = new BoneExtrudeMoveCommand(this.targets);
        this.values = [0,0];
        this.sumMovement = [0,0];

        const update = () => {
            this.command.update(this.values);
        }

        managerForDOMs.set({o: this.values}, null, update)
    }

    execute() {
        app.operator.appendCommand(this.command);
        app.operator.execute();
    }

    init() {
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
        managerForDOMs.update(this.values);
        return true;
    }

    mousedown(/** @type {InputManager} */inputManager) {
        return {complete: true};
    }
}