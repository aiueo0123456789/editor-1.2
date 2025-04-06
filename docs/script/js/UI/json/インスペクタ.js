import { stateMachine } from "../../main.js";
import { hierarchy } from "../../ヒエラルキー.js";

export class Inspector {
    constructor() {
        this.inputObject = {"h": hierarchy, "s": stateMachine};

        const update = () => {

        }

        this.struct = {
            inputObject: {h: "hierarchy"},
            DOM: [
                {type: "section", name: "test", children: [
                    {type: "input", label: "test0", name: "test0", min: 0, max: 10, withObject: {object: "h/graphicMeshs/0", parameter: "zIndex"}},
                    {type: "input", label: "test1", name: "test1", min: 0, max: 10, withObject: {object: "h/graphicMeshs/0", parameter: "zIndex"}},
                    {type: "list", option: "min", name: "test2", withObject: {object: "s/state/data/activeObject/animationBlock/animationBlock"}, liStruct: [
                        {type: "div", "style": "flex", children: [
                            {type: "dbInput", withObject: {object: "", parameter: "name"}},
                            // {type: "icon-img", name: "icon", withObject: {object: "", parameter: "type"}},
                            {type: "input", name: "test1", min: 0, max: 10, withObject: {object: "", parameter: "weight"}}
                        ]},
                    ]},
                    {type: "select", name: "test3", withObject: {object: "h/0", parameter: "test"}}
                ]}
            ],
            utility: {
                "testTest": {}
            }
        };
    }
}
