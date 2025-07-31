import { app } from "../../app/app.js";
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
        if (app.scene.state.activeObject.type == "アーマチュア") {
            this.command = new BoneDelete(app.scene.state.getSelectBone());
        } else {
            this.command = new DeleteVerticesCommand(app.scene.state.getSelectVertices());
        }
        return {complete: true};
    }
}