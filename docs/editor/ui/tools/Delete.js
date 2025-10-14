import { app } from "../../../main.js";
import { DeleteVerticesCommand } from "../../commands/mesh/mesh.js";
import { BoneDelete } from "../../commands/bone/bone.js";

export class DeleteTool {
    constructor(operator) {
        this.operator = operator;
    }

    execute() {
        app.operator.appendCommand(this.command);
        app.operator.execute();
    }

    init() {
        if (app.context.activeObject.type == "アーマチュア") {
            this.command = new BoneDelete(app.context.getSelectBones);
        } else {
            this.command = new DeleteVerticesCommand(app.context.getSelectVertices);
        }
        return {complete: true};
    }
}