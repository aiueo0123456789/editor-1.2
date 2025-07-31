import { app } from "../../app/app.js";
import { EdgeJoinCommand } from "../../commands/mesh/mesh.js";

export class EdgeJoinTool {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.command = new EdgeJoinCommand(app.scene.state.activeObject, app.scene.state.getSelectVertices().map(vertex => vertex.localIndex));
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