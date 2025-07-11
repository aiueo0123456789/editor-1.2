import { app } from "../../../app.js";

export class BonePropertyModal {
    constructor() {
        this.name = "ボーン";
        this.values = [0,0,0,0];
        this.struct = {
            inputObject: {"areasConifg": app.appConfig.areasConfig, "h": app.hierarchy, "scene": app.scene, "values": this.values},
            DOM: [
                {type: "div", class: "sideBar-shelfe", children: [
                    {type: "section", name: "ボーンアタッチメント", children: [
                        {type: "path", sourceObject: "scene/runtimeData/armatureData/getSelectBone", updateEventTarget: "ボーン選択", children: [
                            {type: "dbInput", withObject: "0/index", options: {type: "text"}},
                            {type: "dbInput", withObject: "0/parent/index", options: {type: "text"}},
                        ]},
                    ]}
                ]}
            ]
        };
    }
}