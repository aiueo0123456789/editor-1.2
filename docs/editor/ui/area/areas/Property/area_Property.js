import { app } from "../../../../../main.js";
import { CreateObjectCommand, RemoveObjectCommand } from "../../../../commands/object/object.js";

export class Area_Property {
    constructor(area) {
        this.dom = area.main;

        this.struct = {
            inputObject: {"scene": app.scene, "areaConfig": app.appConfig.areasConfig["Outliner"], "app": app},
            DOM: [
                {tagType: "section", name: "アニメーション", children: [
                    {tagType: "input", label: "開始", value: "scene/frame_start", type: "number", min: 0, max: 500, step: 1},
                    {tagType: "input", label: "終了", value: "scene/frame_end", type: "number", min: 0, max: 500, step: 1},
                    {tagType: "input", label: "再生速度", value: "scene/frame_speed", type: "number", min: 0, max: 10, step: 0.1},
                ]},
                {tagType: "section", name: "マスク", children: [
                    {tagType: "list", label: "マスク", appendEvent: () => {
                        app.operator.appendCommand(new CreateObjectCommand({type: "マスクテクスチャ", name: "名称未設定"}));
                        app.operator.execute();
                    }, deleteEvent: (masks) => {
                        app.operator.appendCommand(new RemoveObjectCommand(masks));
                        app.operator.execute();
                    }, withObject: "scene/objects/maskTextures", options: {type: "min"}, liStruct:[
                        {tagType: "gridBox", axis: "c", allocation: "50% 1fr", children: [
                            {tagType: "dblClickInput", value: "/name", options: {tagType: "text"}},
                            {tagType: "padding", size: "10px"},
                        ]},
                    ]}
                ]},
                {tagType: "section", name: "パラメーターコレクター", children: [
                    {tagType: "list", appendEvent: () => {
                        // appendAnimationToObject(app.context.activeObject, "新規");
                    }, deleteEvent: (animations) => {
                        for (const animation of animations) {
                            // deleteAnimationToObject(app.context.activeObject, animation);
                        }
                    }, withObject: "scene/objects/parameterManagers", options: {}, liStruct:[
                        {tagType: "nodeFromFunction", source: "/getNodeData"}
                    ]}
                ]},
                {tagType: "section", name: "カメラ", children: [
                    {tagType: "input", label: "表示範囲x", value: "scene/objects/renderingCamera/displayRange/0", type: "number", min: 1, max: 2048, step: 1},
                    {tagType: "input", label: "表示範囲y", value: "scene/objects/renderingCamera/displayRange/1", type: "number", min: 1, max: 2048, step: 1},
                ]}
            ],
        };

        this.creatorForUI = area.creatorForUI;
        this.creatorForUI.create(area.main, this.struct);
    }
}