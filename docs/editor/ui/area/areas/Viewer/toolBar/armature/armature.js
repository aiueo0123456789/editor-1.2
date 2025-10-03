import { app } from "../../../../../../../main.js";

export class ArmaturePropertyModal {
    constructor() {
        this.name = "アーマチュア";
        this.values = [0,0,0,0];
        this.struct = {
            inputObject: {"areasConifg": app.appConfig.areasConfig, "outliner": app.scene.outliner, "scene": app.scene, "values": this.values},
            DOM: [
                {tagType: "div", class: "sideBar-shelfe", children: [
                    {tagType: "section", name: "アーマチュア", children: [
                        {tagType: "path", sourceObject: "scene/state/activeObject", updateEventTarget: "アクティブオブジェクト", children: [
                            {tagType: "dbInput", value: "/name", options: {tagType: "text"}},
                        ]}
                    ]}
                ]}
            ]
        };
    }
}