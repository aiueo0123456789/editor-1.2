import { app } from "../../../../../app/app.js";
import { DeleteVerticesCommand } from "../../../../../commands/mesh/mesh.js";
import { BoneDelete } from "../../../../../commands/bone/bone.js";

export class DeleteTool {
    constructor(operator) {
        this.operator = operator;
    }

    init() {
        if (app.scene.state.activeObject.type == "アーマチュア") {
            this.command = new BoneDelete(app.scene.state.getSelectBone());
            app.operator.appendCommand(this.command);
            app.operator.execute();
        } else {
            this.command = new DeleteVerticesCommand(app.scene.state.getSelectVertices());
            app.operator.appendCommand(this.command);
            app.operator.execute();
        }
        return {complete: true};
    }
}