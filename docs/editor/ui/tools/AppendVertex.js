import { app } from "../../../main.js";

// 制作途中
export class AppendVertex {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.modal = {
            inputObject: {},
            DOM: []
        };
        this.activateKey = "v";
    }

    execute() {
        app.operator.appendCommand(this.command);
        app.operator.execute();
    }

    async init(input) {
        // this.command = new AppendVertexCommand(app.context.activeObject, input.position);
        return {complete: true};
    }
}