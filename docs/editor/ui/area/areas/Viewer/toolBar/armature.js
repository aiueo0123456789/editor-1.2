import { app } from "../../../../../app/app.js";

export class ArmaturePropertyModal {
    constructor() {
        this.name = "アーマチュア";
        this.values = [0,0,0,0];
        this.struct = {
            inputObject: {"areasConifg": app.appConfig.areasConfig, "h": app.hierarchy, "scene": app.scene, "values": this.values},
            DOM: [
                {type: "div", class: "sideBar-shelfe", children: [
                    {type: "section", name: "アーマチュア", children: [
                        {type: "path", sourceObject: "scene/state/activeObject", updateEventTarget: "アクティブオブジェクト", children: [
                            {type: "dbInput", withObject: "/name", options: {type: "text"}},
                        ]}
                    ]}
                ]}
            ]
        };
    }
}