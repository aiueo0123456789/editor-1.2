import { app } from "../../../main.js";
import { AppendPointCommand } from "../../commands/mesh/bezier.js";


export class AppendPoint {
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
        this.command = new AppendPointCommand(app.scene.state.activeObject, input.position);
        return {complete: true};
    }
}