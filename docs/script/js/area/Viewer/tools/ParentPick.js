import { app } from "../../../app.js";
import { InputManager } from "../../../app/InputManager.js";
import { managerForDOMs } from "../../../UI/制御.js";
import { ChangeParentCommand } from "../../../機能/オペレーター/ヒエラルキー/親要素の変更.js";
import { ModalOperator } from "../../補助/ModalOperator.js";

export class ParentPickModal {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.command = new ChangeParentCommand(app.scene.state.selectedObject);
        this.values = [null];
        this.modal = {
            inputObject: {"values": this.values},
            struct: {
                DOM: [
                    {type: "div", class: "shelfe", children: [
                        {type: "title", text: "ParentPickModal", class: "shelfeTitle"},
                        {type: "input", label: "親", withObject: {object: "values/0", parameter: "name"}, options: {type: "text"}},
                    ]}
                ]
            }
        };
        this.activateKey = "p";

        const update = () => {
            if (!this.command) return ;
            this.command.update(this.values[0]);
        }
        managerForDOMs.set({o: this.values, g: "_", i: "0"}, null, update, null);
    }

    async init(type) {
    }

    mousemove(/** @type {InputManager} */inputManager) {
    }

    async mousedown(/** @type {InputManager} */inputManager) {
        console.log("親変更")
        const parent = await app.scene.selectedForObject(inputManager.position, {types: ["アーマチュア", "ベジェモディファイア"]});
        this.values[0] = parent[0];
        managerForDOMs.update(this.values);
        app.operator.appendCommand(this.command);
        app.operator.update();
        return {complete: true};
    }
}