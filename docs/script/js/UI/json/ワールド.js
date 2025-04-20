import { app } from "../../app.js";

function appendEvent() {
    renderObjectManager.appendMaskTexture("未設定");
}

function deleteEvent(selects) {
    selects.forEach(select => {
        renderObjectManager.deleteMaskTexture(select);
    });
}

export class World {
    constructor() {
        this.inputObject = {"h": app.hierarchy,"r": app.scene};

        this.struct = {
            inputObject: {h: "hierarchy"},
            DOM: [
                {type: "section", name: "test", children: [
                    {type: "input", label: "test0", name: "test0", min: 0, max: 10, withObject: {object: "h/graphicMeshs/0", parameter: "zIndex"}},
                    {type: "input", label: "test1", name: "test1", min: 0, max: 10, withObject: {object: "h/graphicMeshs/0", parameter: "zIndex"}},
                    {type: "list", option: "min", action: "auto", name: "test2", appendEvent: {function: appendEvent}, deleteEvent: {function: deleteEvent, submitData: ["selects"]}, withObject: {object: "r/maskTextures"}, liStruct: [
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
