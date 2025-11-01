import { app } from "../../../../../main.js";
import { CreateObjectCommand, DeleteObjectCommand } from "../../../../commands/object/object.js";
import { BlendShape } from "../../../../core/objects/blendShape.js";
import { mathVec2 } from "../../../../utils/mathVec.js";
import { calculateLocalMousePosition } from "../../../../utils/utility.js";

export class Area_Property {
    constructor(area) {
        this.dom = area.main;

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
                            {tagType: "dblClickInput", value: "/name", options: {tagType: "text"}},
                        ]},
                    ]}
                ]},
                // {tagType: "section", name: "パラメーターコレクター", children: [
                //     {tagType: "list", appendEvent: () => {
                //         // appendAnimationToObject(app.context.activeObject, "新規");
                //     }, deleteEvent: (animations) => {
                //         for (const animation of animations) {
                //             // deleteAnimationToObject(app.context.activeObject, animation);
                //         }
                //     }, src: "scene/objects/parameterManagers", options: {}, liStruct:[
                //         {tagType: "nodeFromFunction", source: "/getNodeData"}
                //     ]}
                // ]},
                {tagType: "section", name: "カメラ", children: [
                    {tagType: "input", label: "表示範囲x", value: "scene/objects/renderingCamera/displayRange/0", type: "number", min: 1, max: 2048, step: 1, custom: {visual: "range"}},
                    {tagType: "input", label: "表示範囲y", value: "scene/objects/renderingCamera/displayRange/1", type: "number", min: 1, max: 2048, step: 1, custom: {visual: "range"}},
                ]},
                {tagType: "section", name: "ブレンドアニメーション", children: [
                    {tagType: "list", label: "ブレンドアニメーション", appendEvent: () => {
                        app.operator.appendCommand(new CreateObjectCommand({type: "ブレンドシェイプ", name: "名称未設定", dimension: 2, max: [10,10], min: [-10,-10]}));
                        app.operator.execute();
                    }, deleteEvent: (blendShape) => {
                        app.operator.appendCommand(new DeleteObjectCommand(blendShape));
                        app.operator.execute();
                    }, src: "scene/objects/blendShapes", liStruct:[
                        {tagType: "box", children: [
                            {tagType: "dblClickInput", value: "/name", options: {tagType: "text"}},
                            {tagType: "canvas", color: "rgb(153, 153, 153)", draw: (/** @type {HTMLCanvasElement} */cvs, /** @type {BlendShape} */object) => {
                            }, init: (/** @type {HTMLCanvasElement} */cvs, /** @type {BlendShape} */object) => {
                                let isClick = false;
                                cvs.addEventListener("mousedown",() => {
                                    isClick = true;
                                    mathVec2.set(object.value, calculateLocalMousePosition(cvs, app.input.position, 1));
                                })
                                cvs.addEventListener("mouseup",() => {
                                    isClick = false;
                                    mathVec2.set(object.value, calculateLocalMousePosition(cvs, app.input.position, 1));
                                })
                                cvs.addEventListener("mousemove",() => {
                                    if (isClick) mathVec2.set(object.value, calculateLocalMousePosition(cvs, app.input.position, 1));
                                })

                                const update = () => {
                                    const size = mathVec2.scaleR(mathVec2.subR(object.max, object.min), 10);
                                    cvs.style.width = `${size[0]}px`;
                                    cvs.style.height = `${size[1]}px`;
                                    cvs.width = size[0];
                                    cvs.height = size[1];
                                    const ctx = cvs.getContext("2d");
                                    ctx.clearRect(0, 0, cvs.width, cvs.height);

                                    ctx.fillStyle = "rgb(255, 0, 0)";
                                    ctx.beginPath();
                                    ctx.arc(...object.value, 5, 0, Math.PI * 2);
                                    ctx.fill();
                                    requestAnimationFrame(update);
                                }

                                update();
                            }},
                        ]},
                    ]}
                ]}
            ],
        };

        this.creatorForUI = area.creatorForUI;
        this.creatorForUI.create(area.main, this.struct);
    }
}