import { renderObjectManager } from "../../main.js";
import { hierarchy } from "../../ヒエラルキー.js";

export class World {
    constructor() {
        this.inputObject = {"h": hierarchy,"r": renderObjectManager};

        this.struct = {
            inputObject: {h: "hierarchy"},
            DOM: [
                {type: "section", name: "test", children: [
                    {type: "input", "label": "test0", name: "test0", min: 0, max: 10, withObject: {object: "h/graphicMeshs/0", parameter: "zIndex"}},
                    {type: "input", "label": "test1", name: "test1", min: 0, max: 10, withObject: {object: "h/graphicMeshs/0", parameter: "zIndex"}},
                    {type: "list", "option": "min", name: "test2", withObject: {object: "r/maskTextures"}, liStruct: [
                        {type: "div", "style": "flex", children: [
                            {type: "dbInput", withObject: {object: "", parameter: "name"}},
                            {type: "icon-img", name: "icon", withObject: {object: "", parameter: "type"}}
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
