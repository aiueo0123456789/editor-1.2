import { app } from "../../../main.js";
import { managerForDOMs } from "../../utils/ui/util.js";

// 制作途中
export class CreateEdgeTool {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        // this.command = new CreateEdgeFromeTextureCommand(app.context.selectedObjects);
        this.values = [
            1,10, // スライド量
        ];
        this.modal = {
            inputObject: {"value": this.values},
            DOM: [
                {tagType: "div", class: "shelfe", children: [
                    {tagType: "title", text: "CreateEdgeModal", class: "shelfeTitle"},
                    {tagType: "input", label: "x", value: "value/0", type: "number",min: -1000, max: 1000},
                    {tagType: "input", label: "y", value: "value/1", type: "number",min: -1000, max: 1000},
                ]}
            ]
        };
        this.activateKey = "m";

        const update = () => {
            this.command.update(this.values[0],this.values[1]);
        }

        managerForDOMs.set({o: this.values, i: "&all"}, update);
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