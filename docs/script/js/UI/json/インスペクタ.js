import { app } from "../../app.js";
import { stateMachine } from "../../main.js";

export class Inspector {
    constructor() {
        this.inputObject = {"h": app.hierarchy, "s": stateMachine};

        const update = () => {

        }

        this.struct = {
            inputObject: {h: "hierarchy"},
            DOM: [
                {type: "section", name: "基本情報", children: [
                    {type: "input", label: "名前", name: "名前", options: {type: "text"}, withObject: {object: "s/state/data/activeObject", parameter: "name"}},
                    {type: "input", label: "test1", name: "test1", min: 0, max: 10, withObject: {object: "h/graphicMeshs/0", parameter: "zIndex"}},
                    {type: "select", name: "test3", withObject: {object: "h/0", parameter: "test"}}
                ]}
            ],
            utility: {
                "testTest": {}
            }
        };
    }
}
