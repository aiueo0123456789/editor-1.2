import { app } from "../../../app.js";
import { BoneDelete } from "../../../機能/オペレーター/ボーン/編集.js";

export class DeleteTool {
    constructor(operator) {
        this.operator = operator;
        this.targets = app.scene.runtimeData.armatureData.getSelectBone();
        this.command = new BoneDelete(this.targets);
    }

    init() {
        app.operator.appendCommand(this.command);
        app.operator.update();
        return {complete: true};
    }
}