import { app } from "../../../../../main.js";
import { AppendBlendShapePointCommand, AppendShapeKeyInBlendShapeCommand } from "../../../../commands/mesh/shapeKey.js";
import { CopyObjectCommand, CreateObjectCommand, DeleteObjectCommand } from "../../../../commands/object/object.js";
import { AppendParameterInParameterManager, DeleteParameterInParameterManager } from "../../../../commands/parameterManager/parameter.js";
import { BlendShape } from "../../../../core/objects/blendShape.js";
import { MathVec2 } from "../../../../utils/mathVec.js";
import { calculateLocalMousePosition, objectInit } from "../../../../utils/utility.js";

export class Area_Property {
    constructor(area) {
        this.dom = area.main;

        this.pixelDensity = 4;

        this.struct = {
            inputObject: {"scene": app.scene, "areaConfig": app.appConfig.areasConfig["Outliner"], "app": app},
            DOM: [
                {tagType: "section", name: "アニメーション", children: [
                    {tagType: "input", label: "開始", value: "scene/frame_start", type: "number", min: 0, max: 500, step: 1, custom: {visual: "range"}},
                    {tagType: "input", label: "終了", value: "scene/frame_end", type: "number", min: 0, max: 500, step: 1, custom: {visual: "range"}},
                    {tagType: "input", label: "再生速度", value: "scene/frame_speed", type: "number", min: 0, max: 10, step: 0.1, custom: {visual: "range"}},
                ]},
                {tagType: "section", name: "マスク", children: [
                    {tagType: "list", label: "マスク", appendEvent: () => {
                        app.operator.appendCommand(new CreateObjectCommand({type: "マスクテクスチャ", name: "名称未設定"}));
                        app.operator.execute();
                    }, deleteEvent: (masks) => {
                        app.operator.appendCommand(new DeleteObjectCommand(masks));
                        app.operator.execute();
                    }, src: "scene/objects/maskTextures", type: "min", liStruct:[
                        {tagType: "gridBox", axis: "c", allocation: "1fr", children: [
                            {tagType: "dblClickInput", value: "/name"},
                        ]},
                    ]}
                ]},
                {tagType: "section", name: "パラメーターマネージャー", children: [
                    {tagType: "list", appendEvent: () => {
                        app.operator.appendCommand(new CreateObjectCommand({type: "パラメーターマネージャー", name: "名称未設定"}));
                        app.operator.execute();
                    }, deleteEvent: (parameterManagers) => {
                        app.operator.appendCommand(new DeleteObjectCommand(parameterManagers));
                        app.operator.execute();
                    }, src: "scene/objects/parameterManagers", options: {}, notUseActiveAndSelect: true, liStruct:[
                        // {tagType: "nodeFromFunction", source: "/getNodeData"}
                        {tagType: "section", name: {path: "/name"}, children: [
                            {tagType: "gridBox", axis: "c",  allocation: "auto 1fr auto", children: [
                                {tagType: "dblClickInput", value: "/name"},
                                {tagType: "button", textContent: "複製", submitFunction: (object) => {
                                    console.log(object);
                                    app.operator.appendCommand(new CopyObjectCommand(object.normal));
                                    app.operator.execute();
                                }},
                            ]},
                            {tagType: "list", appendEvent: (object) => {
                                app.operator.appendCommand(new AppendParameterInParameterManager(object.normal));
                                app.operator.execute();
                            }, src: "/parameters", options: {}, notUseActiveAndSelect: true, type: "noScroll", liStruct:[
                                {tagType: "gridBox", axis: "c",  allocation: "auto 1fr auto", children: [
                                    {tagType: "dblClickInput", value: "/label"},
                                    {tagType: "input", value: "/value", type: "number"},
                                    {tagType: "button", textContent: "削除", submitFunction: (object) => {
                                        app.operator.appendCommand(new DeleteParameterInParameterManager(object.special.searchTarget.normal, object.normal));
                                        app.operator.execute();
                                    }},
                                ]}
                            ]}
                        ]}
                    ]}
                ]},
                {tagType: "section", name: "カメラ", children: [
                    {tagType: "input", label: "表示範囲x", value: "scene/objects/renderingCamera/displayRange/0", type: "number", min: 1, max: 2048, step: 1, custom: {visual: "range"}},
                    {tagType: "input", label: "表示範囲y", value: "scene/objects/renderingCamera/displayRange/1", type: "number", min: 1, max: 2048, step: 1, custom: {visual: "range"}},
                ]},
            ],
        };

        this.creatorForUI = area.creatorForUI;
        this.creatorForUI.create(area.main, this.struct);
    }
}