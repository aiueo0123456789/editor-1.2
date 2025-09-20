import { app } from "../../../../../../main.js";

export class BonePropertyModal {
    constructor() {
        this.name = "ボーン";
        this.values = [0,0,0,0];
        this.struct = {
            inputObject: {"areasConifg": app.appConfig.areasConfig, "outliner": app.scene.outliner, "scene": app.scene, "values": this.values},
            DOM: [
                {type: "div", class: "sideBar-shelfe", children: [
                    {type: "section", name: "ボーン", children: [
                        {type: "path", sourceObject: "scene/state/getSelectBone", updateEventTarget: "選択物", children: [
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