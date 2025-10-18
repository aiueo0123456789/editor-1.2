import { app } from "../../../main.js";
import { DeleteVerticesCommand } from "../../commands/mesh/mesh.js";
import { BoneDelete } from "../../commands/bone/bone.js";
import { KeyframeInsertCommand } from "../../commands/animation/keyframeInsert.js";

export class KeyframeInsertModal {
    constructor(operator) {
        this.operator = operator;
    }

    execute() {
        app.operator.appendCommand(this.command);
        app.operator.execute();
    }

    init() {
        this.command = new KeyframeInsertCommand();
        return {complete: true};
    }
}