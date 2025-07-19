import { app } from "../../../../../app/app.js";
import { InputManager } from "../../../../../app/inputManager/inputManager.js";
import { managerForDOMs } from "../../../../../utils/ui/util.js";
import { BoneExtrudeMoveCommand } from "../../../../../commands/bone/bone.js";

export class ExtrudeMove {
    constructor(operator) {
        this.operator = operator;
        this.targets = app.scene.runtimeData.armatureData.getSelectVerticesInBone();
        this.command = new BoneExtrudeMoveCommand(this.targets);
        this.value = [0,0];

        const update = () => {
            this.command.update(this.value);
        }

        managerForDOMs.set({o: this.value}, null, update)
    }

    init() {
    }

    mousemove(/** @type {InputManager} */inputManager) {
        this.value[0] += inputManager.movement[0];
        this.value[1] += inputManager.movement[1];
        managerForDOMs.update(this.value);
        return true;
    }

    mousedown(/** @type {InputManager} */inputManager) {
        app.operator.appendCommand(this.command);
        app.operator.execute();
        return {complete: true};
    }
}