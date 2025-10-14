import { app } from "../../../../../main.js";
import { CreateObjectCommand } from "../../../../commands/object/object.js";
import { changeParameter } from "../../../../utils/utility.js";

export class Area_NodeEditor {
    constructor(area) {
        this.dom = area.main;
        this.areaConfig = app.appConfig.areasConfig["NodeEditor"];

        this.struct = {
            inputObject: {"areaConifg": this.areaConfig, "scene": app.scene},
            DOM: [
                {tagType: "gridBox", style: "width: 100%; height: 100%;", axis: "r", allocation: "auto 1fr", children: [
                    {tagType: "option", name: "情報", children: [
                        {tagType: "gridBox", axis: "c", allocation: "auto 1fr auto", children: [
                            {tagType: "select", label: "tool",
                                value: (value) => {
                                    console.log("書き換え")
                                    changeParameter(this.areaConfig, "sourceCode", app.scene.objects.getObjectFromID(value));
                                },
                                sourceObject: () => {
                                    return app.scene.objects.scripts.map(script => {return {name: script.name, id: script.id}});
                                }, options: {initValue: ""}
                            },
                            {tagType: "button", textContent: "追加", submitFunction: () => {
                                app.operator.appendCommand(new CreateObjectCommand({
                                    type: "スクリプト",
                                    name: "名称未設定",
                                    text: "// wgslのシェーダーをかけます"
                                }));
                                app.operator.execute();
                            }},
                        ]}
                    ]},
                    {tagType: "path", sourceObject: "areaConifg/sourceCode", updateEventTarget: {path: "areaConifg/sourceCode"}, children: [
                        {tagType: "codeEditor", source: "/text"}
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