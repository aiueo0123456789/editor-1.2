import { app } from "../../../../../app/app.js";

export class BonePropertyModal {
    constructor() {
        this.name = "ボーン";
        this.values = [0,0,0,0];
        this.struct = {
            inputObject: {"areasConifg": app.appConfig.areasConfig, "h": app.hierarchy, "scene": app.scene, "values": this.values},
            DOM: [
                {type: "div", class: "sideBar-shelfe", children: [
                    {type: "section", name: "ボーン", children: [
                        {type: "path", sourceObject: "scene/state/getSelectBone", updateEventTarget: "ボーン選択", children: [
                            // {type: "text", withObject: "/0/name"},
                            {type: "dbInput", label: "ボーンの名前", withObject: "/0/name", options: {type: "text"}},
                            // {type: "text", label: "親ボーンの名前", withObject: "/0/parent/name"},q
                            {type: "dbInput", label: "親ボーンの名前", withObject: "/0/parent/name", options: {type: "text"}},
                            {type: "input", label: "ボーンの表示色", withObject: "/0/color", options: {type: "color"}},
                        ]},
                    ]}
                ]}
            ]
        };
    }
}