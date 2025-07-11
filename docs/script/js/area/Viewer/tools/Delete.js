import { app } from "../../../app.js";
import { BoneDelete } from "../../../機能/オペレーター/ボーン/編集.js";
import { DeleteVerticesCommand } from "../../../機能/オペレーター/メッシュ/メッシュ.js";

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