import { app } from "../../../../../app/app.js";
import { AppendVertexCommand } from "../../../../../operators/mesh/mesh.js";

export class AppendVertex {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.modal = {
            inputObject: {},
            DOM: []
        };
        this.activateKey = "v";
    }

    async init(input) {
        this.command = new AppendVertexCommand(app.scene.state.activeObject, input.position);
        console.log("追加",app.scene.state.activeObject, input.position);
        app.operator.appendCommand(this.command);
        app.operator.execute();
        return {complete: true};
    }
}