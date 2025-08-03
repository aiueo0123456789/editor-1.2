import { app } from "../../../../app/app.js";
import { changeParameter } from "../../../../utils/utility.js";

export class Area_NodeEditor {
    constructor(area) {
        this.dom = area.main;
        this.areaConfig = app.appConfig.areasConfig["NodeEditor"];

        this.struct = {
            inputObject: {"areaConifg": this.areaConfig, "h": app.hierarchy, "scene": app.scene, "animationPlayer": app.animationPlayer},
            DOM: [
                {type: "gridBox", style: "width: 100%; height: 100%;", axis: "r", allocation: "auto 1fr", children: [
                    {type: "option", style: "padding: 5px", class: "sharpBoder", name: "情報", children: [
                        {type: "select", label: "tool", writeObject: (value) => {
                            console.log("書き換え")
                            changeParameter(this.areaConfig, "sourceCode", app.scene.objects.getObjectFromID(value));
                        }, sourceObject: () => {
                            return app.scene.objects.scripts.map(script => {return {name: script.name, id: script.id}});
                        }, options: {initValue: ""}},
                    ]},
                    {type: "path", sourceObject: "areaConifg/sourceCode", updateEventTarget: {path: "areaConifg/sourceCode"}, children: [
                        {type: "codeEditor", source: "/"}
                    ]}
                ]}
            ],
            utility: {
                "testTest": {}
            }
        };

        this.creatorForUI = area.creatorForUI;
        this.creatorForUI.create(area.main, this.struct, {padding: false});
    }
}