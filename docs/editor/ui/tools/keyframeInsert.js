import { app } from "../../../main.js";
import { KeyframeInsertInSelectedElementCommand } from "../../commands/animation/keyframeInsert.js";

export class KeyframeInsertModal {
    constructor(operator) {
        this.operator = operator;
    }

    execute() {
        app.operator.appendCommand(this.command);
        app.operator.execute();
    }

    init() {
        this.command = new KeyframeInsertInSelectedElementCommand();
        return {complete: true};
    }
}