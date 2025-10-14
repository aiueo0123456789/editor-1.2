import { app } from "../../../../../../../main.js";

export class BonePropertyModal {
    constructor() {
        this.name = "ボーン";
        this.values = [0,0,0,0];
        this.struct = {
            inputObject: {"context": app.context, "areasConifg": app.appConfig.areasConfig, "scene": app.scene, "values": this.values},
            DOM: [
                {tagType: "div", class: "sideBar-shelfe", children: [
                    {tagType: "section", name: "ボーン", children: [
                        {tagType: "path", sourceObject: "context/getSelectBone", updateEventTarget: "選択物", children: [
                            // {tagType: "text", withObject: "/0/name"},
                            {tagType: "dblClickInput", label: "ボーンの名前", value: "/0/name", type: "text"},
                            // {tagType: "text", label: "親ボーンの名前", withObject: "/0/parent/name"},q
                            {tagType: "dblClickInput", label: "親ボーンの名前", value: "/0/parent/name", type: "text"},
                            {tagType: "input", label: "ボーンの表示色", value: "/0/color", type: "color"},
                        ]},
                    ]}
                ]}
            ]
        };
    }
}