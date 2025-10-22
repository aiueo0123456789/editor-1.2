import { app } from "../../../../../../../main.js";

export class ActiveEdgePanel {
    constructor() {
        this.struct = {
            inputObject: {"context": app.context, "areasConifg": app.appConfig.areasConfig, "scene": app.scene, "values": this.values},
            DOM: [
                {tagType: "div", class: "sideBar-shelfe", children: [
                    {tagType: "panel", name: "辺", children: [
                        {tagType: "path", sourceObject: "scene/editData/editObjects/{context/activeObject/id}/activeEdge", updateEventTarget: "辺選択", children: [
                            {tagType: "input", label: "x", value: "/co/0", type: "number"},
                            {tagType: "input", label: "y", value: "/co/1", type: "number"},
                        ]},
                    ]}
                ]}
            ]
        };
    }
}