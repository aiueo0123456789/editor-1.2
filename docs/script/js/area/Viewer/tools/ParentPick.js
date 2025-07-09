import { app } from "../../../app.js";
import { InputManager } from "../../../app/InputManager.js";
import { ChangeParentCommand } from "../../../機能/オペレーター/オブジェクト/オブジェクト.js";
import { ModalOperator } from "../../補助/ModalOperator.js";

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

    async init(type) {
    }

    mousemove(/** @type {InputManager} */inputManager) {
    }

    async mousedown(/** @type {InputManager} */inputManager) {
        console.log("親変更")
        const parent = await app.scene.selectedForObject(inputManager.position, {types: ["アーマチュア", "ベジェモディファイア"]});
        this.command = new ChangeParentCommand(app.scene.state.selectedObject, parent[0]);
        app.operator.appendCommand(this.command);
        app.operator.execute();
        return {complete: true};
    }
}