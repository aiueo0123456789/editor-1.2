import { app } from "../../app/app.js";
import { InputManager } from "../../app/inputManager/inputManager.js";
import { ChangeParentCommand } from "../../commands/object/object.js";
import { ModalOperator } from "../../operators/modalOperator.js";

export class ParentPickModal {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.command = null;
        this.modal = {
            inputObject: {"values": this.values},
            DOM: [
                {type: "div", class: "shelfe", children: [
                    {type: "title", text: "親要素の変更", class: "shelfeTitle"},
                ]}
            ]
        };
        this.activateKey = "p";
    }

    async init() {
    }

    mousemove(/** @type {InputManager} */inputManager) {
    }

    execute() {
        app.operator.appendCommand(this.command);
        app.operator.execute();
    }

    async mousedown(/** @type {InputManager} */inputManager) {
        console.log("親変更")
        const parent = await app.scene.selectedForObject(inputManager.position, {types: ["アーマチュア", "ベジェモディファイア"]});
        this.command = new ChangeParentCommand(app.scene.state.selectedObject, parent[0]);
        return {complete: true};
    }
}