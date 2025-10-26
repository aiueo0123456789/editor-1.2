import { app } from "../../../main.js";
import { InputManager } from "../../app/inputManager/inputManager.js";
import { ChangeParentCommand } from "../../commands/object/object.js";
import { ToolPanelOperator } from "../../operators/toolPanelOperator.js";

export class ParentPickModal {
    constructor(/** @type {ToolPanelOperator} */operator) {
        this.operator = operator;
        this.command = null;
        this.modal = {
            inputObject: {"values": this.values},
            DOM: [
                {tagType: "div", class: "shelfe", children: [
                    {tagType: "title", text: "親要素の変更", class: "shelfeTitle"},
                ]}
            ]
        };
        this.activateKey = "p";
    }

    async init() {
        this.command = new ChangeParentCommand(app.context.selectedObjects);
        app.operator.appendCommand(this.command);
    }

    mousemove(/** @type {InputManager} */inputManager) {
    }

    execute() {
        app.operator.execute();
    }

    async mousedown(/** @type {InputManager} */inputManager) {
        const parent = await app.scene.rayCast(inputManager.position, {types: ["アーマチュア", "ベジェモディファイア"]});
        this.command.update(parent[0]);
        return {complete: true};
    }
}