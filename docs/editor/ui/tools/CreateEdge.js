import { app } from "../../app/app.js";
import { CreateEdge } from "../../commands/mesh/mesh.js";
import { managerForDOMs } from "../../utils/ui/util.js";

export class CreateEdgeTool {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.command = new CreateEdge(app.scene.state.selectedObject);
        this.values = [
            1,10, // スライド量
        ];
        this.modal = {
            inputObject: {"value": this.values},
            DOM: [
                {type: "div", class: "shelfe", children: [
                    {type: "title", text: "CreateEdgeModal", class: "shelfeTitle"},
                    {type: "input", label: "x", withObject: "value/0", options: {type: "number",min: -1000, max: 1000}, custom: {visual: "1"}},
                    {type: "input", label: "y", withObject: "value/1", options: {type: "number",min: -1000, max: 1000}, custom: {visual: "1"}},
                ]}
            ]
        };
        this.activateKey = "m";

        const update = () => {
            this.command.update(this.values[0],this.values[1]);
        }

        managerForDOMs.set({o: this.values, i: "&all"}, null, update);
        update();
    }

    execute() {
        app.operator.appendCommand(this.command);
        app.operator.execute();
    }

    async init() {
        return {complete: true};
    }
}