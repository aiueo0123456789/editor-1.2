import { app } from "../../../../../app/app.js";
import { EdgeJoinCommand } from "../../../../../operators/mesh/mesh.js";

export class EdgeJoinTool {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.command = new EdgeJoinCommand(app.scene.state.activeObject, app.scene.state.getSelectVertices().map(vertex => vertex.index));
        this.modal = {
            inputObject: {},
            DOM: []
        };
        this.activateKey = "j";
    }

    async init() {
        app.operator.appendCommand(this.command);
        app.operator.execute();
        return {complete: true};
    }
}