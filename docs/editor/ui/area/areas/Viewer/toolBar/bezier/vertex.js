import { app } from "../../../../../../../main.js";

export class VertexPropertyModal {
    constructor() {
        this.name = "頂点";
        this.values = [0,0,0,0];
        this.struct = {
            inputObject: {"context": app.context, "areasConifg": app.appConfig.areasConfig, "scene": app.scene, "values": this.values},
            DOM: [
                {tagType: "div", class: "sideBar-shelfe", children: [
                    {tagType: "section", name: "頂点", children: [
                        {tagType: "path", sourceObject: "context/activeVertex", updateEventTarget: "頂点選択", children: [
                            {tagType: "input", label: "x", value: "/co/0", type: "number"},
                            {tagType: "input", label: "y", value: "/co/1", type: "number"},
                            {tagType: "input", label: "ax", value: "/x", type: "number"},
                            {tagType: "input", label: "ay", value: "/y", type: "number"},
                        ]},
                    ]}
                ]}
            ]
        };
    }
}