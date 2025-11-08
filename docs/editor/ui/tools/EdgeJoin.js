import { app } from "../../../main.js";

// 制作途中
export class EdgeJoinTool {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        // this.command = new EdgeJoinCommand(app.context.activeObject, app.context.getSelectVertices.map(vertex => vertex.localIndex));
        this.modal = {
            inputObject: {},
            DOM: []
        };
        this.activateKey = "j";
    }

    execute() {
        app.operator.appendCommand(this.command);
        app.operator.execute();
    }

    async init() {
        return {complete: true};
    }
}