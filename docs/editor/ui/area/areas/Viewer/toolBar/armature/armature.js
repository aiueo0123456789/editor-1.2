import { app } from "../../../../../../../main.js";

export class ArmaturePropertyModal {
    constructor() {
        this.name = "アーマチュア";
        this.values = [0,0,0,0];
        this.struct = {
            inputObject: {"context": app.context, "areasConifg": app.appConfig.areasConfig, "scene": app.scene, "values": this.values},
            DOM: [
                {tagType: "div", class: "sideBar-shelfe", children: [
                    {tagType: "section", name: "アーマチュア", children: [
                        {tagType: "path", sourceObject: "context/activeObject", updateEventTarget: "アクティブオブジェクト", children: [
                            {tagType: "dblClickInput", value: "/name", options: {tagType: "text"}},
                        ]}
                    ]}
                ]}
            ]
        };
    }
}